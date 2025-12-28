'use client'

import { useState, useCallback, useMemo } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'
import { OrchestratorAgent } from '@/lib/agents/orchestrator'
import { ChatMessage, DatasetInfo, DocumentInfo } from '@/lib/agents/types'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [datasets, setDatasets] = useState<DatasetInfo[]>([])
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Create orchestrator instance (memoized to persist across renders)
  const orchestrator = useMemo(() => new OrchestratorAgent(), [])

  const handleDataUpload = useCallback((data: Array<Record<string, unknown>>, fileName: string) => {
    const info = orchestrator.loadData(data, fileName)
    setDatasets(prev => [...prev.filter(d => d.name !== fileName), info])
    
    // Add system message
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `✅ **${fileName}** loaded successfully!\n\n- **Rows:** ${info.rows.toLocaleString()}\n- **Columns:** ${info.columns.join(', ')}\n\nYou can now ask questions about this data.`,
      agent: 'data',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, systemMessage])
  }, [orchestrator])

  const handleDocumentUpload = useCallback((text: string, fileName: string) => {
    const info = orchestrator.loadDocument(text, fileName)
    setDocuments(prev => [...prev.filter(d => d.name !== fileName), info])
    
    // Add system message
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `✅ **${fileName}** loaded successfully!\n\n- **Words:** ${info.wordCount.toLocaleString()}\n- **Key Topics:** ${info.keywords.slice(0, 5).join(', ')}\n\nYou can now ask questions about this document.`,
      agent: 'research',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, systemMessage])
  }, [orchestrator])

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    // Simulate processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    // Process query through orchestrator
    const result = orchestrator.processQuery(content)

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: result.message,
      agent: result.agent,
      timestamp: new Date(),
      data: result.data,
      chart: result.chart,
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsProcessing(false)
  }, [orchestrator])

  const handleClearAll = useCallback(() => {
    orchestrator.clearAll()
    setDatasets([])
    setDocuments([])
    setMessages([])
  }, [orchestrator])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          datasets={datasets}
          documents={documents}
          onDataUpload={handleDataUpload}
          onDocumentUpload={handleDocumentUpload}
          onClearAll={handleClearAll}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        </main>
      </div>
    </div>
  )
}
