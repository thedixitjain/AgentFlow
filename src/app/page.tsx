'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { Landing } from '@/components/Landing'
import { InsightsPanel } from '@/components/InsightsPanel'
import { Dashboard } from '@/components/Dashboard'
import { DocumentFile, Message, ChatHistory, DocumentInsight } from '@/lib/types'
import { storage } from '@/lib/storage'
import { generateInsights } from '@/lib/insights'

export default function Home() {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeDocument, setActiveDocument] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  const [currentChatId, setCurrentChatId] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [insights, setInsights] = useState<DocumentInsight[]>([])
  const [showInsights, setShowInsights] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [agentStates, setAgentStates] = useState<any[]>([])
  const [systemStats, setSystemStats] = useState<any>(null)

  useEffect(() => {
    setChatHistory(storage.getChats())
  }, [])

  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const title = messages[0]?.content.slice(0, 50) || 'New Chat'
      const chat: ChatHistory = {
        id: currentChatId,
        title,
        messages,
        createdAt: new Date(currentChatId),
        updatedAt: new Date(),
      }
      storage.saveChat(chat)
      setChatHistory(storage.getChats())
    }
  }, [messages, currentChatId])

  const handleFileUpload = useCallback((file: DocumentFile) => {
    setDocuments(prev => {
      const exists = prev.find(d => d.name === file.name)
      if (exists) return prev
      return [...prev, file]
    })
    setActiveDocument(file.name)
    setShowLanding(false)
    
    // Generate insights
    const docInsights = generateInsights(file)
    setInsights(docInsights)
    if (docInsights.length > 0) setShowInsights(true)
    
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `**${file.name}** loaded successfully.\n\n` +
        (file.type === 'csv' || file.type === 'xlsx' 
          ? `**${file.data?.length.toLocaleString()}** rows, **${file.columns?.length}** columns.\n\nAsk me anything about this data.`
          : `**${file.content?.split(/\s+/).length.toLocaleString()}** words.\n\nAsk me to summarize or find specific information.`),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, systemMessage])
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentChatId) {
      setCurrentChatId(Date.now().toString())
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const streamingId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }])

    try {
      const activeDoc = documents.find(d => d.name === activeDocument)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          document: activeDoc ? {
            name: activeDoc.name,
            type: activeDoc.type,
            content: activeDoc.content,
            data: activeDoc.data?.slice(0, 50),
            columns: activeDoc.columns,
          } : null,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          mode: activeDoc ? 'document' : 'chat',
        }),
      })

      // Check for error response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setMessages(prev => prev.map(m => 
          m.id === streamingId 
            ? { ...m, content: `Error: ${errorData.error || 'Failed to get response'}`, isStreaming: false }
            : m
        ))
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let sources: Array<{ content: string; score: number }> = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                
                // Check for sources (RAG)
                if (parsed.sources) {
                  sources = parsed.sources
                  setMessages(prev => prev.map(m => 
                    m.id === streamingId 
                      ? { ...m, sources }
                      : m
                  ))
                  continue
                }
                
                // Handle both formats: direct content or OpenAI-style delta
                const content = parsed.content || parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  setMessages(prev => prev.map(m => 
                    m.id === streamingId 
                      ? { ...m, content: fullContent }
                      : m
                  ))
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === streamingId 
          ? { ...m, isStreaming: false }
          : m
      ))
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === streamingId 
          ? { ...m, content: 'Connection error. Please try again.', isStreaming: false }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [documents, activeDocument, messages, currentChatId])

  const handleRemoveDocument = useCallback((name: string) => {
    setDocuments(prev => prev.filter(d => d.name !== name))
    if (activeDocument === name) {
      const remaining = documents.filter(d => d.name !== name)
      setActiveDocument(remaining.length > 0 ? remaining[0].name : null)
      if (remaining.length === 0) {
        setInsights([])
        setShowInsights(false)
      }
    }
  }, [activeDocument, documents])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setActiveDocument(null)
    setCurrentChatId(Date.now().toString())
  }, [])

  const handleLoadChat = useCallback((chat: ChatHistory) => {
    setMessages(chat.messages)
    setCurrentChatId(chat.id)
    setShowLanding(false)
  }, [])

  const handleDeleteChat = useCallback((id: string) => {
    storage.deleteChat(id)
    setChatHistory(storage.getChats())
    if (currentChatId === id) {
      handleNewChat()
    }
  }, [currentChatId, handleNewChat])

  const handleBackToHome = useCallback(() => {
    setShowLanding(true)
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
    setCurrentChatId('')
    setInsights([])
    setShowInsights(false)
  }, [])

  if (showLanding) {
    return (
      <Landing 
        onStart={() => {
          setShowLanding(false)
          setCurrentChatId(Date.now().toString())
        }} 
        onFileUpload={handleFileUpload}
        recentChats={chatHistory.slice(0, 3)}
        onLoadChat={handleLoadChat}
      />
    )
  }

  return (
    <div className="h-screen flex bg-[#212121]">
      <Sidebar
        documents={documents}
        activeDocument={activeDocument}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onFileUpload={handleFileUpload}
        onSelectDocument={(name) => {
          setActiveDocument(name)
          const doc = documents.find(d => d.name === name)
          if (doc) {
            const docInsights = generateInsights(doc)
            setInsights(docInsights)
            if (docInsights.length > 0) setShowInsights(true)
          }
        }}
        onRemoveDocument={handleRemoveDocument}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
        onBackToHome={handleBackToHome}
      />
      
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        hasDocument={!!activeDocument}
        documentName={activeDocument || undefined}
      />

      {showInsights && insights.length > 0 && (
        <InsightsPanel 
          insights={insights}
          onClose={() => setShowInsights(false)}
        />
      )}
    </div>
  )
}
