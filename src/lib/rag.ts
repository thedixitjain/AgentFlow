// Simple in-memory RAG for frontend (Vercel Edge)
// For production, use Pinecone, Weaviate, or similar

interface VectorDoc {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown>
}

interface SearchResult {
  content: string
  score: number
}

class SimpleRAG {
  private documents: Map<string, VectorDoc[]> = new Map()

  // Simple hash-based embedding (for demo - use OpenAI embeddings in production)
  private embed(text: string, dimensions: number = 256): number[] {
    const words = text.toLowerCase().split(/\s+/)
    const embedding = new Array(dimensions).fill(0)
    
    words.forEach((word, idx) => {
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i)
        hash = hash & hash
      }
      const position = Math.abs(hash) % dimensions
      embedding[position] += 1 / (idx + 1)
    })
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude
      }
    }
    
    return embedding
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude > 0 ? dotProduct / magnitude : 0
  }

  // Chunk text into smaller pieces
  chunkText(text: string, chunkSize: number = 500): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/)
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += ' ' + sentence
      }
    }
    
    if (currentChunk.trim()) chunks.push(currentChunk.trim())
    
    // Fallback for text without sentence breaks
    if (chunks.length === 0 && text.length > 0) {
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize))
      }
    }
    
    return chunks
  }

  // Chunk tabular data
  chunkTabularData(data: Record<string, unknown>[], columns: string[]): string[] {
    const chunks: string[] = []
    const rowsPerChunk = 15
    
    // Schema chunk
    chunks.push(`Dataset: ${columns.join(', ')} | Total: ${data.length} rows`)
    
    // Data chunks
    for (let i = 0; i < data.length; i += rowsPerChunk) {
      const slice = data.slice(i, i + rowsPerChunk)
      const text = slice.map((row) => {
        return columns.map(col => `${col}:${row[col]}`).join(', ')
      }).join(' | ')
      chunks.push(text)
    }
    
    return chunks
  }

  // Index document
  index(
    documentId: string,
    content: string | null,
    data: Record<string, unknown>[] | null,
    columns: string[] | null
  ): number {
    let chunks: string[]
    
    if (data && columns) {
      chunks = this.chunkTabularData(data, columns)
    } else if (content) {
      chunks = this.chunkText(content)
    } else {
      return 0
    }
    
    const docs: VectorDoc[] = chunks.map((chunk, idx) => ({
      id: `${documentId}-${idx}`,
      content: chunk,
      embedding: this.embed(chunk),
      metadata: { chunkIndex: idx },
    }))
    
    this.documents.set(documentId, docs)
    return docs.length
  }

  // Search for relevant chunks
  search(query: string, documentId?: string, topK: number = 5): SearchResult[] {
    const queryEmbedding = this.embed(query)
    const results: { content: string; score: number }[] = []
    
    const docsToSearch = documentId 
      ? [this.documents.get(documentId) || []]
      : Array.from(this.documents.values())
    
    for (const docs of docsToSearch) {
      for (const doc of docs) {
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding)
        results.push({ content: doc.content, score })
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }

  // Build context for LLM
  buildContext(results: SearchResult[]): string {
    return results
      .map((r, idx) => `[Source ${idx + 1}] (${(r.score * 100).toFixed(0)}% match)\n${r.content}`)
      .join('\n\n---\n\n')
  }

  // Clear document
  clear(documentId?: string): void {
    if (documentId) {
      this.documents.delete(documentId)
    } else {
      this.documents.clear()
    }
  }

  // Check if document is indexed
  isIndexed(documentId: string): boolean {
    return this.documents.has(documentId)
  }
}

export const rag = new SimpleRAG()
