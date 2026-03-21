import { BaseAgent } from './base.js';
import { llmService } from '../services/llm.js';
import type { Task, Document } from '../types/index.js';

export class VerifierAgent extends BaseAgent {
  constructor() {
    super('verifier');
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    const { claim, document, context } = task.payload as {
      claim: string;
      document?: Document;
      context?: string;
    };

    const verification = await this.verifyClaim(claim, document, context);
    
    return verification;
  }

  private async verifyClaim(
    claim: string,
    document?: Document,
    context?: string
  ): Promise<{
    isVerified: boolean;
    confidence: number;
    explanation: string;
    evidence?: string[];
  }> {
    let systemPrompt = `You are AgentFlow's Verifier Agent. Your job is to verify claims and statements for accuracy.

Respond in JSON format:
{
  "isVerified": boolean,
  "confidence": number (0-1),
  "explanation": "brief explanation",
  "evidence": ["supporting evidence points"]
}

Be rigorous and factual. Only mark as verified if there's clear evidence.`;

    let userPrompt = `Verify this claim: "${claim}"`;

    if (document) {
      const docContext = this.buildDocumentContext(document);
      userPrompt += `\n\nUsing this document as reference:\n${docContext}`;
    }

    if (context) {
      userPrompt += `\n\nAdditional context:\n${context}`;
    }

    const response = await llmService.complete({
      provider: 'groq',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback if JSON parsing fails
    }

    return {
      isVerified: false,
      confidence: 0.5,
      explanation: response.content,
    };
  }

  private buildDocumentContext(document: Document): string {
    if (document.type === 'csv' || document.type === 'xlsx') {
      const data = document.data || [];
      return `Data sample: ${JSON.stringify(data.slice(0, 20), null, 2)}`;
    }
    return document.content?.slice(0, 4000) || '';
  }
}
