import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Simple embedding service using Groq or falling back to basic TF-IDF style
class EmbeddingService {
  private apiKey: string;
  private model: string = 'text-embedding-3-small';

  constructor() {
    this.apiKey = config.llm.openai.apiKey || '';
  }

  // Generate embeddings using OpenAI API (or fallback to local)
  async generateEmbedding(text: string): Promise<number[]> {
    // If OpenAI key available, use their embeddings
    if (this.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            input: text.slice(0, 8000), // Limit input size
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.data[0].embedding;
        }
      } catch (error) {
        logger.warn('OpenAI embedding failed, using local fallback', { error });
      }
    }

    // Fallback: Simple hash-based pseudo-embedding (for demo)
    return this.localEmbedding(text);
  }

  // Generate embeddings for multiple texts
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  // Simple local embedding fallback (TF-IDF inspired)
  private localEmbedding(text: string, dimensions: number = 384): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(dimensions).fill(0);
    
    // Create a simple hash-based embedding
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      const position = Math.abs(hash) % dimensions;
      embedding[position] += 1 / (idx + 1); // Weight by position
    });
    
    // Normalize
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

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
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
