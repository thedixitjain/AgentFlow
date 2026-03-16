import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class EmbeddingService {
  private gemini: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.llm.gemini.apiKey) {
      this.gemini = new GoogleGenerativeAI(config.llm.gemini.apiKey);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text.slice(0, 8000));
        return result.embedding.values;
      } catch (error) {
        logger.warn('Gemini embedding failed, using local fallback', { error });
      }
    }
    return this.localEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }
    return embeddings;
  }

  private localEmbedding(text: string, dimensions: number = 384): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(dimensions).fill(0);

    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      const position = Math.abs(hash) % dimensions;
      embedding[position] += 1 / (idx + 1);
    });

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    return embedding;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }
}

export const embeddingService = new EmbeddingService();
