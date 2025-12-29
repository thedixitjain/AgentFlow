'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { Landing } from '@/components/Landing'
import { DocumentFile, Message, ChatHistory } from '@/lib/types'
import { storage } from '@/lib/storage'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeDocument, setActiveDocument] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])

  const isChat = searchParams.get('chat') === 'true'

  useEffect(() => {
    setChatHistory(storage.getChats())
  }, [])

  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const title = messages[0]?.content.slice(0, 40) || 'New Chat'
      const chat: ChatHistory = {
        id: currentChatId,
        title,
        messages,
        createdAt: new Date(parseInt(currentChatId)),
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
    
    if (!currentChatId) {
      setCurrentChatId(Date.now().toString())
    }

    const fileInfo = file.type === 'csv' || file.type === 'xlsx'
      ? `${file.data?.length.toLocaleString()} rows across ${file.columns?.length} columns`
      : `${file.content?.split(/\s+/).length.toLocaleString()} words`

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I've loaded **${file.name}** successfully.\n\n**Overview:** ${fileInfo}\n\nI'm ready to help you analyze this ${file.type.toUpperCase()} file. You can ask me to:\n- Summarize the content\n- Find specific information\n- Calculate statistics (for data files)\n- Extract key insights\n\nWhat would you like to know?`,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, systemMessage])
    
    if (!isChat) {
      router.push('/?chat=true')
    }
  }, [currentChatId, isChat, router])

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
            data: activeDoc.data?.slice(0, 100),
            columns: activeDoc.columns,
            totalRows: activeDoc.data?.length,
          } : null,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

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
                if (parsed.content) {
                  fullContent += parsed.content
                  setMessages(prev => prev.map(m => 
                    m.id === streamingId ? { ...m, content: fullContent } : m
                  ))
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      setMessages(prev => prev.map(m => 
        m.id === streamingId ? { ...m, isStreaming: false } : m
      ))
    } catch {
      setMessages(prev => prev.map(m => 
        m.id === streamingId 
          ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
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
    }
  }, [activeDocument, documents])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
    setCurrentChatId(Date.now().toString())
    router.push('/?chat=true')
  }, [router])

  const handleLoadChat = useCallback((chat: ChatHistory) => {
    setMessages(chat.messages)
    setCurrentChatId(chat.id)
    router.push('/?chat=true')
  }, [router])

  const handleDeleteChat = useCallback((id: string) => {
    storage.deleteChat(id)
    setChatHistory(storage.getChats())
    if (currentChatId === id) {
      handleNewChat()
    }
  }, [currentChatId, handleNewChat])

  const handleBackToHome = useCallback(() => {
    router.push('/')
  }, [router])

  const handleStartChat = useCallback(() => {
    setCurrentChatId(Date.now().toString())
    router.push('/?chat=true')
  }, [router])

  if (!isChat) {
    return (
      <Landing 
        onStart={handleStartChat}
        onFileUpload={handleFileUpload}
        recentChats={chatHistory.slice(0, 3)}
        onLoadChat={handleLoadChat}
      />
    )
  }

  return (
    <div className="h-screen flex bg-[#0a0a0a]">
      <Sidebar
        documents={documents}
        activeDocument={activeDocument}
        chatHistory={chatHistory}
        onFileUpload={handleFileUpload}
        onSelectDocument={setActiveDocument}
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
        activeDocument={activeDocument}
        onFileUpload={handleFileUpload}
      />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-white/60">Loading AgentFlow...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
