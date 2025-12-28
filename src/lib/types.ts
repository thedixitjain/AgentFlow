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
}
