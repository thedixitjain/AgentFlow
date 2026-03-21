import { BaseAgent } from './base.js';
import { llmService } from '../services/llm.js';
import type { Task, Document } from '../types/index.js';

export class IngestAgent extends BaseAgent {
  constructor() {
    super('ingest');
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    const document = task.payload.document as Document;
    
    // Analyze document structure
    const analysis = await this.analyzeDocument(document);
    
    return {
      documentId: document.id,
      analysis,
      summary: analysis.summary,
      keyMetrics: analysis.metrics,
    };
  }

  private async analyzeDocument(document: Document): Promise<{
    summary: string;
    metrics: Record<string, unknown>;
    schema?: string[];
    sampleData?: Record<string, unknown>[];
  }> {
    if (document.type === 'csv' || document.type === 'xlsx') {
      return this.analyzeTabularData(document);
    } else {
      return this.analyzeTextDocument(document);
    }
  }

  private async analyzeTabularData(document: Document): Promise<{
    summary: string;
    metrics: Record<string, unknown>;
    schema: string[];
    sampleData: Record<string, unknown>[];
  }> {
    const data = document.data || [];
    const columns = document.columns || [];
    
    // Calculate basic statistics
    const numericColumns: Record<string, number[]> = {};
    columns.forEach(col => {
      const values = data
        .map(row => Number(row[col]))
        .filter(v => !isNaN(v));
      if (values.length > 0) {
        numericColumns[col] = values;
      }
    });

    const metrics: Record<string, unknown> = {
      rowCount: data.length,
      columnCount: columns.length,
      columns: columns,
    };

    // Calculate stats for numeric columns
    Object.entries(numericColumns).forEach(([col, values]) => {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      metrics[`${col}_stats`] = { sum, avg, min, max, count: values.length };
    });

    // Generate summary using LLM
    const response = await llmService.complete({
      provider: 'groq',
      messages: [
        {
          role: 'system',
          content: 'You are a data analyst. Provide a brief, professional summary of the dataset.',
        },
        {
          role: 'user',
          content: `Analyze this dataset:
Name: ${document.name}
Rows: ${data.length}
Columns: ${columns.join(', ')}
Sample data (first 5 rows): ${JSON.stringify(data.slice(0, 5), null, 2)}

Provide a 2-3 sentence summary of what this data contains and its potential use cases.`,
        },
      ],
      maxTokens: 200,
    });

    return {
      summary: response.content,
      metrics,
      schema: columns,
      sampleData: data.slice(0, 10),
    };
  }

  private async analyzeTextDocument(document: Document): Promise<{
    summary: string;
    metrics: Record<string, unknown>;
  }> {
    const content = document.content || '';
    const wordCount = content.split(/\s+/).filter(w => w).length;
    const charCount = content.length;
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim()).length;

    const response = await llmService.complete({
      provider: 'groq',
      messages: [
        {
          role: 'system',
          content: 'You are a document analyst. Provide a brief, professional summary.',
        },
        {
          role: 'user',
          content: `Summarize this document in 2-3 sentences:

${content.slice(0, 4000)}${content.length > 4000 ? '...[truncated]' : ''}`,
        },
      ],
      maxTokens: 200,
    });

    return {
      summary: response.content,
      metrics: {
        wordCount,
        charCount,
        paragraphs,
        type: document.type,
      },
    };
  }
}
