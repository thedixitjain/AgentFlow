import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from './embeddings.js';
import { logger } from '../utils/logger.js';
import { loadJsonFile, saveJsonFile } from './persistence.js';

export interface VectorDocument {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    type: string;
    createdAt: Date;
    [key: string]: unknown;
  };
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
}

interface PersistedVectorDocument extends Omit<VectorDocument, 'metadata'> {
  metadata: Omit<VectorDocument['metadata'], 'createdAt'> & {
    createdAt: string;
  };
}

class VectorStore {
  private documents: Map<string, VectorDocument>;
  private documentIndex: Map<string, string[]>;

  constructor() {
    const stored = loadJsonFile<PersistedVectorDocument[]>('vectors.json', []);
    this.documents = new Map();
    this.documentIndex = new Map();

    stored.forEach(document => {
      const restored: VectorDocument = {
        ...document,
        metadata: {
          source: document.metadata.source as string,
          type: document.metadata.type as string,
          ...document.metadata,
          createdAt: new Date(document.metadata.createdAt),
        },
      };

      this.documents.set(restored.id, restored);
      const existing = this.documentIndex.get(restored.documentId) || [];
      existing.push(restored.id);
      this.documentIndex.set(restored.documentId, existing);
    });
  }

  private persist(): void {
    const serialized: PersistedVectorDocument[] = Array.from(this.documents.values()).map(document => ({
      ...document,
      metadata: {
        ...document.metadata,
        createdAt: document.metadata.createdAt.toISOString(),
      },
    }));

    saveJsonFile('vectors.json', serialized);
  }

  async addDocument(
    documentId: string,
    content: string,
    chunkIndex: number,
    metadata: Record<string, unknown>
  ): Promise<VectorDocument> {
    const embedding = await embeddingService.generateEmbedding(content);

    const vectorDoc: VectorDocument = {
      id: uuidv4(),
      documentId,
      chunkIndex,
      content,
      embedding,
      metadata: {
        source: metadata.source as string || 'unknown',
        type: metadata.type as string || 'text',
        createdAt: new Date(),
        ...metadata,
      },
    };

    this.documents.set(vectorDoc.id, vectorDoc);

    const existing = this.documentIndex.get(documentId) || [];
    existing.push(vectorDoc.id);
    this.documentIndex.set(documentId, existing);
    this.persist();

    logger.debug('Added vector document', {
      vectorId: vectorDoc.id,
      documentId,
      chunkIndex,
      contentLength: content.length,
    });

    return vectorDoc;
  }

  async addDocumentChunks(
    documentId: string,
    chunks: string[],
    metadata: Record<string, unknown>
  ): Promise<VectorDocument[]> {
    this.deleteDocument(documentId);

    const vectorDocs: VectorDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const doc = await this.addDocument(documentId, chunks[i], i, metadata);
      vectorDocs.push(doc);
    }

    logger.info('Added document chunks to vector store', {
      documentId,
      chunkCount: chunks.length,
    });

    return vectorDocs;
  }

  async search(
    query: string,
    topK: number = 5,
    documentId?: string
  ): Promise<SearchResult[]> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const results: SearchResult[] = [];

    this.documents.forEach((doc) => {
      if (documentId && doc.documentId !== documentId) return;

      const score = embeddingService.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ document: doc, score });
    });

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    logger.debug('Vector search completed', {
      query: query.slice(0, 50),
      resultsCount: topResults.length,
      topScore: topResults[0]?.score || 0,
    });

    return topResults;
  }

  getDocumentChunks(documentId: string): VectorDocument[] {
    const vectorIds = this.documentIndex.get(documentId) || [];
    return vectorIds
      .map(id => this.documents.get(id))
      .filter((doc): doc is VectorDocument => doc !== undefined)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  deleteDocument(documentId: string): number {
    const vectorIds = this.documentIndex.get(documentId) || [];

    vectorIds.forEach(id => this.documents.delete(id));
    this.documentIndex.delete(documentId);

    if (vectorIds.length > 0) {
      this.persist();
      logger.info('Deleted document from vector store', {
        documentId,
        chunksDeleted: vectorIds.length,
      });
    }

    return vectorIds.length;
  }

  getStats(): {
    totalDocuments: number;
    totalChunks: number;
    avgChunksPerDocument: number;
  } {
    const totalChunks = this.documents.size;
    const totalDocuments = this.documentIndex.size;

    return {
      totalDocuments,
      totalChunks,
      avgChunksPerDocument: totalDocuments > 0 ? totalChunks / totalDocuments : 0,
    };
  }

  clear(): void {
    this.documents.clear();
    this.documentIndex.clear();
    this.persist();
    logger.info('Vector store cleared');
  }
}

export const vectorStore = new VectorStore();
