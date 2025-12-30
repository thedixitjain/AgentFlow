import { vectorStore, SearchResult } from './vectorStore.js';
import { llmService } from './llm.js';
import { logger } from '../utils/logger.js';
import type { Document } from '../types/index.js';

export interface RAGResponse {
  answer: string;
  sources: Array<{
    content: string;
    score: number;
    chunkIndex: number;
  }>;
  tokensUsed: number;
  retrievalTime: number;
  generationTime: number;
}

class RAGService {
  private chunkSize: number = 500; // characters per chunk
  private chunkOverlap: number = 50; // overlap between chunks

  // Chunk text into smaller pieces for embedding
  chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // If no sentence breaks, chunk by character count
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += this.chunkSize - this.chunkOverlap) {
        chunks.push(text.slice(i, i + this.chunkSize));
      }
    }

    return chunks;
  }

  // Chunk tabular data (CSV/Excel)
  chunkTabularData(data: Record<string, unknown>[], columns: string[]): string[] {
    const chunks: string[] = [];
    const rowsPerChunk = 20;

    // Add schema as first chunk
    chunks.push(`Dataset Schema:\nColumns: ${columns.join(', ')}\nTotal Rows: ${data.length}`);

    // Chunk rows
    for (let i = 0; i < data.length; i += rowsPerChunk) {
      const rowSlice = data.slice(i, i + rowsPerChunk);
      const chunkText = rowSlice.map((row, idx) => {
        const rowStr = columns.map(col => `${col}: ${row[col]}`).join(', ');
        return `Row ${i + idx + 1}: ${rowStr}`;
      }).join('\n');
      
      chunks.push(chunkText);
    }

    // Add summary statistics chunk
    const numericCols = columns.filter(col => 
      data.some(row => typeof row[col] === 'number')
    );
    
    if (numericCols.length > 0) {
      const stats = numericCols.map(col => {
        const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
        if (values.length === 0) return null;
        
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return `${col}: Sum=${sum.toFixed(2)}, Avg=${avg.toFixed(2)}, Min=${min}, Max=${max}`;
      }).filter(Boolean).join('\n');
      
      chunks.push(`Summary Statistics:\n${stats}`);
    }

    return chunks;
  }

  // Index a document for RAG
  async indexDocument(document: Document): Promise<number> {
    let chunks: string[];
    
    if (document.type === 'csv' || document.type === 'xlsx') {
      chunks = this.chunkTabularData(
        document.data || [],
        document.columns || []
      );
    } else {
      chunks = this.chunkText(document.content || '');
    }

    await vectorStore.addDocumentChunks(document.id, chunks, {
      source: document.name,
      type: document.type,
      size: document.size,
    });

    logger.info('Document indexed for RAG', {
      documentId: document.id,
      documentName: document.name,
      chunkCount: chunks.length,
    });

    return chunks.length;
  }

  // Query with RAG
  async query(
    question: string,
    documentId?: string,
    topK: number = 5
  ): Promise<RAGResponse> {
    const retrievalStart = Date.now();
    
    // Retrieve relevant chunks
    const searchResults = await vectorStore.search(question, topK, documentId);
    const retrievalTime = Date.now() - retrievalStart;

    if (searchResults.length === 0) {
      return {
        answer: 'No relevant information found in the documents.',
        sources: [],
        tokensUsed: 0,
        retrievalTime,
        generationTime: 0,
      };
    }

    // Build context from retrieved chunks
    const context = this.buildContext(searchResults);
    
    // Generate answer using LLM
    const generationStart = Date.now();
    const response = await this.generateAnswer(question, context);
    const generationTime = Date.now() - generationStart;

    logger.info('RAG query completed', {
      question: question.slice(0, 50),
      sourcesUsed: searchResults.length,
      retrievalTime,
      generationTime,
    });

    return {
      answer: response.content,
      sources: searchResults.map(r => ({
        content: r.document.content.slice(0, 200) + '...',
        score: r.score,
        chunkIndex: r.document.chunkIndex,
      })),
      tokensUsed: response.tokensUsed,
      retrievalTime,
      generationTime,
    };
  }

  private buildContext(results: SearchResult[]): string {
    const contextParts = results.map((r, idx) => {
      return `[Source ${idx + 1}] (Relevance: ${(r.score * 100).toFixed(1)}%)\n${r.document.content}`;
    });

    return contextParts.join('\n\n---\n\n');
  }

  private async generateAnswer(question: string, context: string) {
    const systemPrompt = `You are AgentFlow's RAG Agent. Answer questions based ONLY on the provided context.

Rules:
- Use information from the context to answer
- If the context doesn't contain the answer, say so
- Cite sources using [Source N] format
- Be precise and factual
- Use markdown formatting

Context:
${context}`;

    return llmService.complete({
      provider: 'groq',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
    });
  }

  // Get RAG statistics
  getStats() {
    return vectorStore.getStats();
  }
}

export const ragService = new RAGService();
