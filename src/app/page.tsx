'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { Landing } from '@/components/Landing'
import { DocumentFile, Message } from '@/lib/types'

export default function Home() {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeDocument, setActiveDocument] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)

  const handleFileUpload = useCallback((file: DocumentFile) => {
    setDocuments(prev => {
      const exists = prev.find(d => d.name === file.name)
      if (exists) return prev
      return [...prev, file]
    })
    setActiveDocument(file.name)
    setShowLanding(false)
    
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
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

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

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Connection error. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [documents, activeDocument, messages])

  const handleRemoveDocument = useCallback((name: string) => {
    setDocuments(prev => prev.filter(d => d.name !== name))
    if (activeDocument === name) {
      const remaining = documents.filter(d => d.name !== name)
      setActiveDocument(remaining.length > 0 ? remaining[0].name : null)
    }
  }, [activeDocument, documents])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setActiveDocument(null)
  }, [])

  const handleBackToHome = useCallback(() => {
    setShowLanding(true)
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
  }, [])

  if (showLanding) {
    return (
      <Landing 
        onStart={() => setShowLanding(false)} 
        onFileUpload={handleFileUpload} 
      />
    )
  }

  return (
    <div className="h-screen flex bg-black">
      <Sidebar
        documents={documents}
        activeDocument={activeDocument}
        onFileUpload={handleFileUpload}
        onSelectDocument={setActiveDocument}
        onRemoveDocument={handleRemoveDocument}
        onNewChat={handleNewChat}
        onBackToHome={handleBackToHome}
      />
      
      <Chat
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        hasDocument={!!activeDocument}
      />
    </div>
  )
}
