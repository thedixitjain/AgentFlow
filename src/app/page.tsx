'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { Landing } from '@/components/Landing'
import { InsightsPanel } from '@/components/InsightsPanel'
import { SystemInsightsPanel } from '@/components/SystemInsightsPanel'
import { DocumentFile, Message, ChatHistory, DocumentInsight } from '@/lib/types'
import { generateInsights } from '@/lib/insights'
import { api, type Session, type Document as ApiDocument, type Message as ApiMessage, type SystemStats, type EvalRun } from '@/lib/api'

function mapDocument(document: ApiDocument): DocumentFile {
  return {
    id: document.id,
    name: document.name,
    type: document.type as DocumentFile['type'],
    size: document.size,
    content: document.content,
    data: document.data,
    columns: document.columns,
    uploadedAt: new Date(document.metadata.uploadedAt),
  }
}

function mapMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    agentType: message.agentType,
    sources: message.sources,
  }
}

function mapSessionToHistory(session: Session): ChatHistory {
  const firstUserMessage = session.messages.find(message => message.role === 'user')?.content
  const title = firstUserMessage?.slice(0, 50) || session.documents[0]?.name || 'New Chat'

  return {
    id: session.id,
    title,
    messages: session.messages.map(mapMessage),
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }
}

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
  const [showSystemInsights, setShowSystemInsights] = useState(false)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentEval, setRecentEval] = useState<EvalRun | null>(null)

  const refreshChatHistory = useCallback(async () => {
    try {
      const sessions = await api.listSessions()
      setChatHistory(sessions.map(mapSessionToHistory))
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
    }
  }, [])

  const refreshSystemInsights = useCallback(async () => {
    try {
      const stats = await api.getStats()
      setSystemStats(stats)
      setRecentEval(stats.latestEval)
    } catch (error) {
      console.error('Failed to refresh system insights:', error)
    }
  }, [])

  const runEvalSuite = useCallback(async () => {
    try {
      const evalRun = await api.runEvalSuite()
      setRecentEval(evalRun)
      await refreshSystemInsights()
    } catch (error) {
      console.error('Failed to run eval suite:', error)
    }
  }, [refreshSystemInsights])

  const loadSession = useCallback(async (sessionId: string) => {
    const session = await api.getSession(sessionId)
    const nextDocuments = session.documents.map(mapDocument)
    const nextMessages = session.messages.map(mapMessage)

    setCurrentChatId(session.id)
    setDocuments(nextDocuments)
    setMessages(nextMessages)
    setActiveDocument(nextDocuments[nextDocuments.length - 1]?.name || null)
    setShowLanding(false)

    const activeDoc = nextDocuments[nextDocuments.length - 1]
    if (activeDoc) {
      const docInsights = generateInsights(activeDoc)
      setInsights(docInsights)
      setShowInsights(docInsights.length > 0)
    } else {
      setInsights([])
      setShowInsights(false)
    }
  }, [])

  const createNewSession = useCallback(async () => {
    const session = await api.createSession()
    setCurrentChatId(session.id)
    setDocuments([])
    setMessages([])
    setActiveDocument(null)
    setInsights([])
    setShowInsights(false)
    setShowSystemInsights(false)
    setShowLanding(false)
    await refreshChatHistory()
    return session.id
  }, [refreshChatHistory])

  const ensureSession = useCallback(async () => {
    if (currentChatId) return currentChatId
    return createNewSession()
  }, [createNewSession, currentChatId])

  useEffect(() => {
    void refreshChatHistory()
  }, [refreshChatHistory])

  useEffect(() => {
    if (showSystemInsights) {
      void refreshSystemInsights()
    }
  }, [refreshSystemInsights, showSystemInsights])

  const handleFileUpload = useCallback(async (file: DocumentFile) => {
    const sessionId = await ensureSession()

    try {
      const saved = await api.createParsedDocument(sessionId, {
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
        data: file.data,
        columns: file.columns,
      })

      const mappedDocument = mapDocument(saved)
      setDocuments(prev => {
        const existingIndex = prev.findIndex(document => document.id === mappedDocument.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = mappedDocument
          return next
        }
        return [...prev, mappedDocument]
      })
      setActiveDocument(mappedDocument.name)
      setShowLanding(false)

      const docInsights = generateInsights(mappedDocument)
      setInsights(docInsights)
      setShowInsights(docInsights.length > 0)
      await refreshChatHistory()
    } catch (error) {
      console.error('Failed to save document:', error)
    }
  }, [ensureSession, refreshChatHistory])

  const handleSendMessage = useCallback(async (content: string) => {
    const sessionId = await ensureSession()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const streamingId = `stream-${Date.now()}`
    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }])

    try {
      const activeDoc = documents.find(document => document.name === activeDocument)

      await api.streamMessage(
        sessionId,
        content,
        (chunk) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, content: message.content + chunk }
              : message
          ))
        },
        (agentUsed) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, agentType: agentUsed, isStreaming: false }
              : message
          ))
        },
        activeDoc?.id,
        (sources) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, sources }
              : message
          ))
        },
        (error) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, content: error, isStreaming: false }
              : message
          ))
        }
      )

      await loadSession(sessionId)
      await refreshChatHistory()
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.map(message =>
        message.id === streamingId
          ? { ...message, content: 'Connection error. Please try again.', isStreaming: false }
          : message
      ))
    } finally {
      setIsLoading(false)
    }
  }, [activeDocument, documents, ensureSession, loadSession, refreshChatHistory])

  const handleRemoveDocument = useCallback((name: string) => {
    void (async () => {
      const target = documents.find(document => document.name === name)
      if (target?.id && currentChatId) {
        try {
          await api.deleteDocument(currentChatId, target.id)
        } catch (error) {
          console.error('Failed to delete document:', error)
        }
      }

      setDocuments(prev => prev.filter(document => document.name !== name))
      if (activeDocument === name) {
        const remaining = documents.filter(document => document.name !== name)
        const nextActive = remaining.length > 0 ? remaining[0].name : null
        setActiveDocument(nextActive)

        if (nextActive) {
          const nextDocument = remaining[0]
          const docInsights = generateInsights(nextDocument)
          setInsights(docInsights)
          setShowInsights(docInsights.length > 0)
        } else {
          setInsights([])
          setShowInsights(false)
        }
      }
    })()
  }, [activeDocument, currentChatId, documents])

  const handleNewChat = useCallback(() => {
    void createNewSession()
  }, [createNewSession])

  const handleLoadChat = useCallback((chat: ChatHistory) => {
    void loadSession(chat.id)
  }, [loadSession])

  const handleDeleteChat = useCallback((id: string) => {
    void (async () => {
      try {
        await api.deleteSession(id)
        await refreshChatHistory()
        if (currentChatId === id) {
          setMessages([])
          setDocuments([])
          setActiveDocument(null)
          setCurrentChatId('')
          setInsights([])
          setShowInsights(false)
          setShowSystemInsights(false)
          setShowLanding(true)
        }
      } catch (error) {
        console.error('Failed to delete session:', error)
      }
    })()
  }, [currentChatId, refreshChatHistory])

  const handleBackToHome = useCallback(() => {
    setShowLanding(true)
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
    setCurrentChatId('')
    setInsights([])
    setShowInsights(false)
    setShowSystemInsights(false)
  }, [])

  if (showLanding) {
    return (
      <Landing
        onStart={() => {
          void createNewSession()
        }}
        onFileUpload={handleFileUpload}
        recentChats={chatHistory.slice(0, 3)}
        onLoadChat={handleLoadChat}
      />
    )
  }

  return (
    <div className="h-screen flex bg-[var(--chat-bg)]">
      <Sidebar
        documents={documents}
        activeDocument={activeDocument}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onFileUpload={handleFileUpload}
        onSelectDocument={(name) => {
          setActiveDocument(name)
          const document = documents.find(item => item.name === name)
          if (document) {
            const docInsights = generateInsights(document)
            setInsights(docInsights)
            setShowInsights(docInsights.length > 0)
          }
        }}
        onRemoveDocument={handleRemoveDocument}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
        onBackToHome={handleBackToHome}
        onOpenSystemInsights={() => {
          setShowSystemInsights(true)
          void refreshSystemInsights()
        }}
      />

      <Chat
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        hasDocument={!!activeDocument}
        documentName={activeDocument || undefined}
        sessionId={currentChatId || undefined}
      />

      {showInsights && insights.length > 0 && (
        <InsightsPanel
          insights={insights}
          onClose={() => setShowInsights(false)}
        />
      )}

      {showSystemInsights && (
        <SystemInsightsPanel
          stats={systemStats}
          recentEval={recentEval}
          onRefresh={refreshSystemInsights}
          onRunEval={runEvalSuite}
          onClose={() => setShowSystemInsights(false)}
        />
      )}
    </div>
  )
}
