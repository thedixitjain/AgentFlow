export type AgentType = 'data' | 'research' | 'orchestrator'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  agent?: AgentType
  timestamp: Date
  data?: Record<string, unknown>
  chart?: ChartData
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  data: Array<Record<string, unknown>>
  xKey: string
  yKey: string
  title: string
}

export interface DatasetInfo {
  name: string
  rows: number
  columns: string[]
  numericColumns: string[]
  categoricalColumns: string[]
  preview: Array<Record<string, unknown>>
}

export interface DocumentInfo {
  name: string
  wordCount: number
  summary: string
  keywords: string[]
}

export interface QueryResult {
  success: boolean
  agent: AgentType
  message: string
  data?: Record<string, unknown>
  chart?: ChartData
  error?: string
}
