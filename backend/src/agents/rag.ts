import { BaseAgent } from './base.js';
import { ragService } from '../services/rag.js';
import { vectorStore } from '../services/vectorStore.js';
import type { Task, Document } from '../types/index.js';

export class RAGAgent extends BaseAgent {
  constructor() {
    super('manager'); // Using 'manager' type for RAG agent
  }

  async process(task: Task): Promise<Record<string, unknown>> {
    const { action, question, document, documentId, topK } = task.payload as {
      action: 'index' | 'query' | 'search';
      question?: string;
      document?: Document;
      documentId?: string;
      topK?: number;
    };

    switch (action) {
      case 'index':
        return this.indexDocument(document!);
      case 'query':
        return this.queryRAG(question!, documentId, topK);
      case 'search':
        return this.semanticSearch(question!, documentId, topK);
      default:
        throw new Error(`Unknown RAG action: ${action}`);
    }
  }

  private async indexDocument(document: Document): Promise<Record<string, unknown>> {
    const chunkCount = await ragService.indexDocument(document);
    
    return {
      success: true,
      documentId: document.id,
      documentName: document.name,
      chunksCreated: chunkCount,
      message: `Document indexed successfully with ${chunkCount} chunks`,
    };
  }

  private async queryRAG(
    question: string,
    documentId?: string,
    topK: number = 5
  ): Promise<Record<string, unknown>> {
    const response = await ragService.query(question, documentId, topK);
    
    return {
      answer: response.answer,
      sources: response.sources,
      metrics: {
        tokensUsed: response.tokensUsed,
        retrievalTimeMs: response.retrievalTime,
        generationTimeMs: response.generationTime,
        sourcesUsed: response.sources.length,
      },
    };
  }

  private async semanticSearch(
    query: string,
    documentId?: string,
    topK: number = 10
  ): Promise<Record<string, unknown>> {
    const results = await vectorStore.search(query, topK, documentId);
    
    return {
      results: results.map(r => ({
        content: r.document.content,
        score: r.score,
        documentId: r.document.documentId,
        chunkIndex: r.document.chunkIndex,
        metadata: r.document.metadata,
      })),
      totalResults: results.length,
    };
  }
}
