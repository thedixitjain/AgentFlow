export interface DocumentFile {
  name: string
  type: 'pdf' | 'csv' | 'xlsx' | 'txt'
  size: number
  content?: string
  data?: Record<string, unknown>[]
  columns?: string[]
  uploadedAt: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface DocumentInsight {
  type: 'metric' | 'chart' | 'summary'
  title: string
  value?: string | number
  data?: Array<{ name: string; value: number }>
  description?: string
}
