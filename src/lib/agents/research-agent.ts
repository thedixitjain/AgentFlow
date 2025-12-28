import { DocumentInfo, QueryResult } from './types'

export class ResearchAssistantAgent {
  private documents: Map<string, DocumentContent> = new Map()

  loadDocument(text: string, name: string): DocumentInfo {
    const cleanedText = this.cleanText(text)
    const chunks = this.splitIntoChunks(cleanedText)
    const summary = this.generateSummary(cleanedText)
    const keywords = this.extractKeywords(cleanedText)

    const doc: DocumentContent = {
      name,
      fullText: cleanedText,
      chunks,
      summary,
      keywords,
      wordCount: cleanedText.split(/\s+/).length,
    }

    this.documents.set(name, doc)

    return {
      name,
      wordCount: doc.wordCount,
      summary: summary.slice(0, 200) + (summary.length > 200 ? '...' : ''),
      keywords,
    }
  }

  processQuery(query: string, documentName?: string): QueryResult {
    const name = documentName || Array.from(this.documents.keys())[0]
    const doc = this.documents.get(name)

    if (!doc) {
      return {
        success: false,
        agent: 'research',
        message: 'No document loaded. Please upload a PDF or text file first.',
        error: 'No document available',
      }
    }

    const queryLower = query.toLowerCase()

    try {
      // Summarization
      if (this.matchesPattern(queryLower, ['summarize', 'summary', 'overview', 'abstract'])) {
        return this.handleSummarization(doc)
      }

      // Keyword extraction
      if (this.matchesPattern(queryLower, ['keyword', 'key term', 'extract', 'topic'])) {
        return this.handleKeywordExtraction(doc)
      }

      // Methodology
      if (this.matchesPattern(queryLower, ['methodology', 'method', 'approach', 'technique'])) {
        return this.handleMethodologyQuery(doc, query)
      }

      // Results/Findings
      if (this.matchesPattern(queryLower, ['result', 'finding', 'conclusion', 'outcome'])) {
        return this.handleResultsQuery(doc, query)
      }

      // General Q&A
      return this.handleGeneralQuery(doc, query)
    } catch (error) {
      return {
        success: false,
        agent: 'research',
        message: `Error processing query: ${error}`,
        error: String(error),
      }
    }
  }

  private matchesPattern(query: string, patterns: string[]): boolean {
    return patterns.some(p => query.includes(p))
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()-]/g, '')
      .trim()
  }

  private splitIntoChunks(text: string, chunkSize = 500): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const chunks: string[] = []
    let currentChunk = ''

    sentences.forEach(sentence => {
      if (currentChunk.length + sentence.length < chunkSize) {
        currentChunk += sentence
      } else {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = sentence
      }
    })

    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks
  }

  private generateSummary(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    if (sentences.length <= 3) return text

    // Simple extractive summarization - take first, middle, and last important sentences
    const scored = sentences.map((s, i) => ({
      sentence: s.trim(),
      score: this.scoreSentence(s, i, sentences.length),
      index: i,
    }))

    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index)

    return topSentences.map(s => s.sentence).join(' ')
  }

  private scoreSentence(sentence: string, index: number, total: number): number {
    let score = 0
    
    // Position scoring
    if (index < total * 0.2) score += 3 // Early sentences
    if (index > total * 0.8) score += 2 // Late sentences
    
    // Length scoring (prefer medium length)
    const words = sentence.split(/\s+/).length
    if (words > 10 && words < 40) score += 2
    
    // Keyword scoring
    const importantWords = ['important', 'significant', 'result', 'conclusion', 'finding', 'demonstrate', 'show', 'prove']
    if (importantWords.some(w => sentence.toLowerCase().includes(w))) score += 2

    return score
  }

  private extractKeywords(text: string, topK = 10): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
      'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
      'he', 'she', 'his', 'her', 'which', 'who', 'whom', 'what', 'when', 'where',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
    ])

    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    const filtered = words.filter(w => !stopWords.has(w))
    
    const freq = new Map<string, number>()
    filtered.forEach(w => freq.set(w, (freq.get(w) || 0) + 1))

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
  }

  private handleSummarization(doc: DocumentContent): QueryResult {
    return {
      success: true,
      agent: 'research',
      message: `**Document Summary:**\n\n${doc.summary}\n\n**Key Statistics:**\n- Word Count: ${doc.wordCount.toLocaleString()}\n- Key Topics: ${doc.keywords.slice(0, 5).join(', ')}`,
      data: {
        summary: doc.summary,
        wordCount: doc.wordCount,
        keywords: doc.keywords,
      },
    }
  }

  private handleKeywordExtraction(doc: DocumentContent): QueryResult {
    const keywordList = doc.keywords
      .map((kw, i) => `${i + 1}. **${kw}**`)
      .join('\n')

    return {
      success: true,
      agent: 'research',
      message: `**Extracted Keywords:**\n\n${keywordList}`,
      data: { keywords: doc.keywords },
    }
  }

  private handleMethodologyQuery(doc: DocumentContent, _query: string): QueryResult {
    const methodKeywords = ['method', 'approach', 'technique', 'procedure', 'process', 'framework', 'model', 'algorithm']
    const relevantChunks = doc.chunks.filter(chunk => 
      methodKeywords.some(kw => chunk.toLowerCase().includes(kw))
    )

    if (relevantChunks.length === 0) {
      return {
        success: true,
        agent: 'research',
        message: 'No specific methodology section found in the document. The document may not contain explicit methodology descriptions.',
      }
    }

    return {
      success: true,
      agent: 'research',
      message: `**Methodology Information:**\n\n${relevantChunks[0]}`,
      data: { relevantSections: relevantChunks.slice(0, 2) },
    }
  }

  private handleResultsQuery(doc: DocumentContent, _query: string): QueryResult {
    const resultKeywords = ['result', 'finding', 'conclusion', 'outcome', 'demonstrate', 'show', 'indicate', 'reveal']
    const relevantChunks = doc.chunks.filter(chunk => 
      resultKeywords.some(kw => chunk.toLowerCase().includes(kw))
    )

    if (relevantChunks.length === 0) {
      return {
        success: true,
        agent: 'research',
        message: 'No specific results section found. Try asking about specific topics mentioned in the document.',
      }
    }

    return {
      success: true,
      agent: 'research',
      message: `**Key Findings:**\n\n${relevantChunks[0]}`,
      data: { relevantSections: relevantChunks.slice(0, 2) },
    }
  }

  private handleGeneralQuery(doc: DocumentContent, query: string): QueryResult {
    // Simple keyword-based search
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    
    const scoredChunks = doc.chunks.map(chunk => ({
      chunk,
      score: queryWords.filter(w => chunk.toLowerCase().includes(w)).length,
    }))

    const bestMatch = scoredChunks.sort((a, b) => b.score - a.score)[0]

    if (bestMatch.score === 0) {
      return {
        success: true,
        agent: 'research',
        message: `I couldn't find specific information about "${query}" in the document. Try asking about:\n\n- Document summary\n- Key topics: ${doc.keywords.slice(0, 5).join(', ')}\n- Methodology or approach\n- Results and findings`,
      }
    }

    return {
      success: true,
      agent: 'research',
      message: `**Relevant Information:**\n\n${bestMatch.chunk}`,
      data: { relevance: bestMatch.score },
    }
  }

  getDocuments(): string[] {
    return Array.from(this.documents.keys())
  }

  getDocumentInfo(name: string): DocumentInfo | undefined {
    const doc = this.documents.get(name)
    if (!doc) return undefined
    
    return {
      name: doc.name,
      wordCount: doc.wordCount,
      summary: doc.summary,
      keywords: doc.keywords,
    }
  }

  clearDocuments(): void {
    this.documents.clear()
  }
}

interface DocumentContent {
  name: string
  fullText: string
  chunks: string[]
  summary: string
  keywords: string[]
  wordCount: number
}
