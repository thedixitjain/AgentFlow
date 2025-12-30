import { BaseAgent } from './base.js';
import { llmService } from '../services/llm.js';
import type { Task, Document } from '../types/index.js';

export class QuestionAgent extends BaseAgent {
  constructor() {
    super('question');
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    const { question, document, history } = task.payload as {
      question: string;
      document?: Document;
      history?: Array<{ role: string; content: string }>;
    };

    const response = await this.answerQuestion(question, document, history);
    
    return {
      answer: response.content,
      confidence: this.assessConfidence(response.content),
      tokensUsed: response.tokensUsed,
      provider: response.provider,
    };
  }

  private async answerQuestion(
    question: string,
    document?: Document,
    history?: Array<{ role: string; content: string }>
  ) {
    let systemPrompt = `You are AgentFlow's Question Agent, an expert at answering questions accurately and concisely.

Guidelines:
- Provide direct, factual answers
- Use data from the document when available
- Be precise with numbers and calculations
- Acknowledge uncertainty when appropriate
- Use markdown formatting for clarity`;

    if (document) {
      const context = this.buildDocumentContext(document);
      systemPrompt += `\n\nDocument Context:\n${context}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-6),
      { role: 'user', content: question },
    ];

    return llmService.complete({
      provider: 'groq',
      messages,
      temperature: 0.3,
    });
  }

  private buildDocumentContext(document: Document): string {
    if (document.type === 'csv' || document.type === 'xlsx') {
      const data = document.data || [];
      const columns = document.columns || [];
      
      return `
Document: ${document.name}
Type: ${document.type.toUpperCase()}
Columns: ${columns.join(', ')}
Total Rows: ${data.length}

Sample Data (first 30 rows):
${JSON.stringify(data.slice(0, 30), null, 2)}`;
    } else {
      return `
Document: ${document.name}
Type: ${document.type.toUpperCase()}

Content:
${document.content?.slice(0, 6000) || 'No content available'}`;
    }
  }

  private assessConfidence(answer: string): number {
    // Simple heuristic for confidence
    const uncertainPhrases = [
      'i\'m not sure',
      'it\'s unclear',
      'might be',
      'possibly',
      'i don\'t have',
      'cannot determine',
    ];
    
    const lowerAnswer = answer.toLowerCase();
    const hasUncertainty = uncertainPhrases.some(phrase => 
      lowerAnswer.includes(phrase)
    );
    
    return hasUncertainty ? 0.6 : 0.9;
  }
}
