import { v4 as uuidv4 } from 'uuid';
import { ragService } from './rag.js';
import { vectorStore } from './vectorStore.js';
import { loadJsonFile, saveJsonFile } from './persistence.js';
import { telemetryService } from './telemetry.js';
import { evalRuns, evalCaseScore } from '../utils/metrics.js';
import { logger } from '../utils/logger.js';
import type { Document } from '../types/index.js';

type EvalDocument =
  | {
      name: string;
      type: 'txt';
      content: string;
    }
  | {
      name: string;
      type: 'csv';
      data: Record<string, unknown>[];
      columns: string[];
    };

interface EvalCase {
  id: string;
  title: string;
  document: EvalDocument;
  question: string;
  expectedKeywords: string[];
}

interface EvalSuite {
  id: string;
  title: string;
  cases: EvalCase[];
}

interface EvalCaseResult {
  caseId: string;
  title: string;
  question: string;
  answer: string;
  score: number;
  passed: boolean;
  matchedKeywords: string[];
  missingKeywords: string[];
  retrievalTimeMs: number;
  generationTimeMs: number;
  topScore: number;
  tokensUsed: number;
}

interface EvalRunRecord {
  id: string;
  suiteId: string;
  createdAt: string;
  averageScore: number;
  passedCases: number;
  totalCases: number;
  results: EvalCaseResult[];
}

const suites: EvalSuite[] = [
  {
    id: 'baseline-document-qa',
    title: 'Baseline Document QA',
    cases: [
      {
        id: 'q4-growth',
        title: 'Quarterly text summary',
        document: {
          name: 'q4-report.txt',
          type: 'txt',
          content: 'Revenue grew 25 percent in Q4 across Europe and churn fell by 3 percent.',
        },
        question: 'What happened in Q4?',
        expectedKeywords: ['revenue', '25', 'churn'],
      },
      {
        id: 'sales-region',
        title: 'Regional sales csv',
        document: {
          name: 'regional-sales.csv',
          type: 'csv',
          columns: ['Region', 'Revenue', 'Quarter'],
          data: [
            { Region: 'North', Revenue: 120000, Quarter: 'Q4' },
            { Region: 'South', Revenue: 90000, Quarter: 'Q4' },
            { Region: 'East', Revenue: 75000, Quarter: 'Q4' },
          ],
        },
        question: 'Which region had the highest revenue in Q4?',
        expectedKeywords: ['north', '120000'],
      },
      {
        id: 'support-metrics',
        title: 'Support metrics text',
        document: {
          name: 'support.txt',
          type: 'txt',
          content: 'Average response time dropped to 2 hours while CSAT increased to 94 percent after the new workflow launched.',
        },
        question: 'What changed after the new workflow launched?',
        expectedKeywords: ['2 hours', '94', 'csat'],
      },
    ],
  },
];

class EvalService {
  private runs: EvalRunRecord[];

  constructor() {
    this.runs = loadJsonFile<EvalRunRecord[]>('eval-runs.json', []);
  }

  private persistRuns(): void {
    saveJsonFile('eval-runs.json', this.runs);
  }

  listSuites(): Array<{ id: string; title: string; caseCount: number }> {
    return suites.map(suite => ({
      id: suite.id,
      title: suite.title,
      caseCount: suite.cases.length,
    }));
  }

  listRuns(limit: number = 10): EvalRunRecord[] {
    return this.runs
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  private toDocument(evalDocument: EvalDocument): Document {
    return {
      id: uuidv4(),
      name: evalDocument.name,
      type: evalDocument.type,
      size: evalDocument.type === 'txt'
        ? evalDocument.content.length
        : JSON.stringify(evalDocument.data).length,
      content: evalDocument.type === 'txt' ? evalDocument.content : undefined,
      data: evalDocument.type === 'csv' ? evalDocument.data : undefined,
      columns: evalDocument.type === 'csv' ? evalDocument.columns : undefined,
      metadata: {
        uploadedAt: new Date(),
      },
    };
  }

  private scoreAnswer(answer: string, expectedKeywords: string[]): {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    passed: boolean;
  } {
    const normalized = answer.toLowerCase();
    const matchedKeywords = expectedKeywords.filter(keyword =>
      normalized.includes(keyword.toLowerCase())
    );
    const missingKeywords = expectedKeywords.filter(keyword =>
      !normalized.includes(keyword.toLowerCase())
    );
    const score = expectedKeywords.length > 0
      ? matchedKeywords.length / expectedKeywords.length
      : 0;

    return {
      score,
      matchedKeywords,
      missingKeywords,
      passed: score >= 0.67,
    };
  }

  async runSuite(suiteId: string): Promise<EvalRunRecord> {
    const suite = suites.find(item => item.id === suiteId);
    if (!suite) {
      throw new Error(`Unknown eval suite: ${suiteId}`);
    }

    const results: EvalCaseResult[] = [];

    for (const testCase of suite.cases) {
      const document = this.toDocument(testCase.document);
      await ragService.indexDocument(document);

      try {
        const response = await ragService.query(testCase.question, document.id, 5);
        const scored = this.scoreAnswer(response.answer, testCase.expectedKeywords);
        evalCaseScore.observe({ suite: suite.id }, scored.score);

        results.push({
          caseId: testCase.id,
          title: testCase.title,
          question: testCase.question,
          answer: response.answer,
          score: scored.score,
          passed: scored.passed,
          matchedKeywords: scored.matchedKeywords,
          missingKeywords: scored.missingKeywords,
          retrievalTimeMs: response.retrievalTime,
          generationTimeMs: response.generationTime,
          topScore: response.topScore,
          tokensUsed: response.tokensUsed,
        });
      } finally {
        vectorStore.deleteDocument(document.id);
      }
    }

    const averageScore = results.length > 0
      ? results.reduce((sum, result) => sum + result.score, 0) / results.length
      : 0;
    const passedCases = results.filter(result => result.passed).length;
    const run: EvalRunRecord = {
      id: uuidv4(),
      suiteId: suite.id,
      createdAt: new Date().toISOString(),
      averageScore,
      passedCases,
      totalCases: results.length,
      results,
    };

    this.runs.push(run);
    this.persistRuns();
    evalRuns.inc({ suite: suite.id, status: 'completed' });
    telemetryService.recordEvalEvent({
      suite: suite.id,
      averageScore,
      passedCases,
      totalCases: results.length,
    });

    logger.info('Evaluation suite completed', {
      suiteId: suite.id,
      averageScore,
      passedCases,
      totalCases: results.length,
    });

    return run;
  }
}

export const evalService = new EvalService();
