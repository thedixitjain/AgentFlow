import { DataIntelligenceAgent } from './data-agent'
import { ResearchAssistantAgent } from './research-agent'
import { QueryResult, DatasetInfo, DocumentInfo } from './types'

type QueryCategory = 'data' | 'research' | 'general' | 'ambiguous'

export class OrchestratorAgent {
  private dataAgent: DataIntelligenceAgent
  private researchAgent: ResearchAssistantAgent

  private dataKeywords = [
    'total', 'sum', 'average', 'mean', 'count', 'maximum', 'minimum',
    'plot', 'chart', 'graph', 'visualize', 'trend', 'sales', 'revenue',
    'profit', 'expense', 'customer', 'product', 'data', 'csv', 'excel',
    'table', 'column', 'row', 'filter', 'sort', 'group', 'top', 'bottom',
  ]

  private researchKeywords = [
    'paper', 'document', 'pdf', 'research', 'study', 'article',
    'summarize', 'summary', 'extract', 'keyword', 'topic', 'theme',
    'methodology', 'conclusion', 'finding', 'result', 'abstract',
  ]

  constructor() {
    this.dataAgent = new DataIntelligenceAgent()
    this.researchAgent = new ResearchAssistantAgent()
  }

  processQuery(query: string): QueryResult {
    const category = this.classifyQuery(query)

    switch (category) {
      case 'data':
        return this.dataAgent.processQuery(query)
      case 'research':
        return this.researchAgent.processQuery(query)
      case 'ambiguous':
        return this.handleAmbiguousQuery(query)
      default:
        return this.handleGeneralQuery(query)
    }
  }

  private classifyQuery(query: string): QueryCategory {
    const queryLower = query.toLowerCase()

    // Check for explicit file type mentions
    if (/\.(csv|xlsx?|excel)/.test(queryLower) || queryLower.includes('spreadsheet')) {
      return 'data'
    }
    if (/\.pdf/.test(queryLower) || queryLower.includes('paper') || queryLower.includes('document')) {
      return 'research'
    }

    // Score based on keywords
    const dataScore = this.dataKeywords.filter(kw => queryLower.includes(kw)).length
    const researchScore = this.researchKeywords.filter(kw => queryLower.includes(kw)).length

    if (dataScore > researchScore && dataScore > 0) return 'data'
    if (researchScore > dataScore && researchScore > 0) return 'research'
    if (dataScore > 0 && researchScore > 0) return 'ambiguous'

    // Check what data is available
    const hasData = this.dataAgent.getDatasets().length > 0
    const hasDocs = this.researchAgent.getDocuments().length > 0

    if (hasData && !hasDocs) return 'data'
    if (hasDocs && !hasData) return 'research'

    return 'general'
  }

  private handleAmbiguousQuery(query: string): QueryResult {
    const hasData = this.dataAgent.getDatasets().length > 0
    const hasDocs = this.researchAgent.getDocuments().length > 0

    if (hasData && !hasDocs) {
      return this.dataAgent.processQuery(query)
    }
    if (hasDocs && !hasData) {
      return this.researchAgent.processQuery(query)
    }

    return {
      success: true,
      agent: 'orchestrator',
      message: `Your query could apply to both data analysis and research documents. Please specify:\n\n- For **data analysis**: mention "data", "chart", or specific metrics\n- For **research**: mention "document", "paper", or "summarize"`,
    }
  }

  private handleGeneralQuery(query: string): QueryResult {
    const queryLower = query.toLowerCase()

    if (queryLower.includes('help') || queryLower.includes('what can you do')) {
      return {
        success: true,
        agent: 'orchestrator',
        message: `**I'm a Multi-Agent AI System** that can help with:\n\n📊 **Data Analysis**\n- Upload CSV/Excel files\n- Ask questions like "What's the total revenue?" or "Plot sales by category"\n\n📄 **Research Assistant**\n- Upload PDF documents\n- Get summaries, extract keywords, or ask questions about the content\n\n**Try uploading a file to get started!**`,
      }
    }

    return {
      success: true,
      agent: 'orchestrator',
      message: `I can help you analyze data or research documents. Please:\n\n1. **Upload a file** (CSV, Excel, or PDF)\n2. **Ask a question** about your data\n\nType "help" to learn more about my capabilities.`,
    }
  }

  // Data operations
  loadData(data: Array<Record<string, unknown>>, name: string): DatasetInfo {
    return this.dataAgent.loadData(data, name)
  }

  getDatasets(): string[] {
    return this.dataAgent.getDatasets()
  }

  getDatasetInfo(name: string): DatasetInfo | undefined {
    return this.dataAgent.getDatasetInfo(name)
  }

  // Document operations
  loadDocument(text: string, name: string): DocumentInfo {
    return this.researchAgent.loadDocument(text, name)
  }

  getDocuments(): string[] {
    return this.researchAgent.getDocuments()
  }

  getDocumentInfo(name: string): DocumentInfo | undefined {
    return this.researchAgent.getDocumentInfo(name)
  }

  // Clear all data
  clearAll(): void {
    this.dataAgent.clearData()
    this.researchAgent.clearDocuments()
  }

  // Get system status
  getStatus(): { datasets: string[]; documents: string[] } {
    return {
      datasets: this.dataAgent.getDatasets(),
      documents: this.researchAgent.getDocuments(),
    }
  }
}
