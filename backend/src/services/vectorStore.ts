import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from './embeddings.js';
import { logger } from '../utils/logger.js';

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

class VectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private documentIndex: Map<string, string[]> = new Map(); // documentId -> vectorIds

  // Add a document chunk to the store
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
    
    // Update index
    const existing = this.documentIndex.get(documentId) || [];
    existing.push(vectorDoc.id);
    this.documentIndex.set(documentId, existing);

    logger.debug('Added vector document', { 
      vectorId: vectorDoc.id, 
      documentId, 
      chunkIndex,
      contentLength: content.length,
    });

    return vectorDoc;
  }

  // Add multiple chunks from a document
  async addDocumentChunks(
    documentId: string,
    chunks: string[],
    metadata: Record<string, unknown>
  ): Promise<VectorDocument[]> {
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

  // Search for similar documents
  async search(
    query: string,
    topK: number = 5,
    documentId?: string
  ): Promise<SearchResult[]> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    const results: SearchResult[] = [];
    
    this.documents.forEach((doc) => {
      // Filter by documentId if specified
      if (documentId && doc.documentId !== documentId) return;
      
      const score = embeddingService.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ document: doc, score });
    });

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    logger.debug('Vector search completed', {
      query: query.slice(0, 50),
      resultsCount: topResults.length,
      topScore: topResults[0]?.score || 0,
    });

    return topResults;
  }

  // Get all chunks for a document
  getDocumentChunks(documentId: string): VectorDocument[] {
    const vectorIds = this.documentIndex.get(documentId) || [];
    return vectorIds
      .map(id => this.documents.get(id))
      .filter((doc): doc is VectorDocument => doc !== undefined)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  // Delete all chunks for a document
  deleteDocument(documentId: string): number {
    const vectorIds = this.documentIndex.get(documentId) || [];
    
    vectorIds.forEach(id => this.documents.delete(id));
    this.documentIndex.delete(documentId);

    logger.info('Deleted document from vector store', {
      documentId,
      chunksDeleted: vectorIds.length,
    });

    return vectorIds.length;
  }

  // Get store statistics
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

  // Clear all documents
  clear(): void {
    this.documents.clear();
    this.documentIndex.clear();
    logger.info('Vector store cleared');
  }
}

export const vectorStore = new VectorStore();
