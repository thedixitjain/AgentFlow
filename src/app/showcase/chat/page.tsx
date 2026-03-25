'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import type { ChatHistory, DocumentFile, Message } from '@/lib/types'

const documents: DocumentFile[] = [
  {
    id: 'doc-1',
    name: 'q4-revenue-report.txt',
    type: 'txt',
    size: 2184,
    content: 'Revenue grew 25 percent across Europe while churn fell by 3 percent.',
    uploadedAt: new Date('2026-03-21T10:00:00Z'),
  },
]

const chatHistory: ChatHistory[] = [
  {
    id: 'demo-chat',
    title: 'Q4 revenue analysis',
    messages: [],
    createdAt: new Date('2026-03-21T10:00:00Z'),
    updatedAt: new Date('2026-03-21T10:05:00Z'),
  },
]

const messages: Message[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'What happened in Q4 across Europe?',
    timestamp: new Date('2026-03-21T10:01:00Z'),
  },
  {
    id: 'm2',
    role: 'assistant',
    content: '### Q4 Summary\nRevenue grew by **25 percent** across Europe, and churn fell by **3 percent**.\n\nThis indicates stronger commercial performance with improved retention.',
    timestamp: new Date('2026-03-21T10:01:03Z'),
    agentType: 'rag',
    sources: [
      {
        content: 'Revenue grew 25 percent across Europe while churn fell by 3 percent.',
        score: 0.91,
      },
    ],
  },
]

export default function ShowcaseChatPage() {
  const router = useRouter()
  return (
    <div className="h-screen flex bg-[#212121]">
      <Sidebar
        documents={documents}
        activeDocument="q4-revenue-report.txt"
        chatHistory={chatHistory}
        currentChatId="demo-chat"
        onFileUpload={() => undefined}
        onSelectDocument={() => undefined}
        onRemoveDocument={() => undefined}
        onNewChat={() => undefined}
        onLoadChat={() => undefined}
        onDeleteChat={() => undefined}
        onBackToHome={() => router.push('/', { scroll: true })}
        onOpenSystemInsights={() => undefined}
        onLoadTemplate={() => undefined}
        onAuthClick={() => undefined}
        onSignOut={() => undefined}
        isMobileOpen={false}
        onCloseMobile={() => undefined}
        persistenceStatus={null}
        authUser={null}
      />
      <Chat
        messages={messages}
        isLoading={false}
        onSendMessage={() => undefined}
        hasDocument
        documentName="q4-revenue-report.txt"
        onNavigateHome={() => router.push('/', { scroll: true })}
        onLoadTemplate={() => undefined}
      />
    </div>
  )
}
