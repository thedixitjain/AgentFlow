import { BaseAgent } from './base.js';
import { llmService } from '../services/llm.js';
import type { Task, Document } from '../types/index.js';

export class SummarizerAgent extends BaseAgent {
  constructor() {
    super('summarizer');
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    const { document, type, maxLength } = task.payload as {
      document: Document;
      type?: 'brief' | 'detailed' | 'bullet';
      maxLength?: number;
    };

    const summary = await this.summarize(document, type || 'brief', maxLength);
    
    return {
      summary: summary.content,
      type: type || 'brief',
      tokensUsed: summary.tokensUsed,
    };
  }

  private async summarize(
    document: Document,
    type: 'brief' | 'detailed' | 'bullet',
    maxLength?: number
  ) {
    const instructions = {
      brief: 'Provide a concise 2-3 sentence summary.',
      detailed: 'Provide a comprehensive summary covering all key points.',
      bullet: 'Provide a bullet-point summary of the main points.',
    };

    let content: string;
    if (document.type === 'csv' || document.type === 'xlsx') {
      content = this.formatTabularData(document);
    } else {
      content = document.content || '';
    }

    const systemPrompt = `You are AgentFlow's Summarizer Agent. ${instructions[type]}
${maxLength ? `Keep the summary under ${maxLength} words.` : ''}

Be accurate, professional, and highlight the most important information.`;

    return llmService.complete({
      provider: 'groq',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summarize this:\n\n${content.slice(0, 8000)}` },
      ],
      temperature: 0.3,
    });
  }

  private formatTabularData(document: Document): string {
    const data = document.data || [];
    const columns = document.columns || [];
    
    // Calculate statistics
    const stats: Record<string, { sum: number; avg: number; min: number; max: number }> = {};
    
    columns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        stats[col] = {
          sum,
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    return `
Dataset: ${document.name}
Rows: ${data.length}
Columns: ${columns.join(', ')}

Statistics:
${Object.entries(stats).map(([col, s]) => 
  `- ${col}: Sum=${s.sum.toFixed(2)}, Avg=${s.avg.toFixed(2)}, Min=${s.min}, Max=${s.max}`
).join('\n')}

Sample Data:
${JSON.stringify(data.slice(0, 10), null, 2)}`;
  }
}
