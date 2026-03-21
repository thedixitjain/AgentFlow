'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { SystemInsightsPanel } from '@/components/SystemInsightsPanel'
import type { ChatHistory, DocumentFile, Message } from '@/lib/types'
import type { EvalRun, SystemStats } from '@/lib/api'

const documents: DocumentFile[] = [
  {
    id: 'doc-1',
    name: 'ops-update.txt',
    type: 'txt',
    size: 1024,
    content: 'Support backlog dropped by 40 percent and CSAT increased to 93 percent.',
    uploadedAt: new Date('2026-03-21T10:00:00Z'),
  },
]

const chatHistory: ChatHistory[] = [
  {
    id: 'demo-chat',
    title: 'Operations review',
    messages: [],
    createdAt: new Date('2026-03-21T10:00:00Z'),
    updatedAt: new Date('2026-03-21T10:05:00Z'),
  },
]

const messages: Message[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'Summarize the operational change.',
    timestamp: new Date('2026-03-21T10:01:00Z'),
  },
  {
    id: 'm2',
    role: 'assistant',
    content: 'The support backlog dropped by 40 percent while CSAT improved to 93 percent, indicating better operational efficiency and customer experience.',
    timestamp: new Date('2026-03-21T10:01:03Z'),
    agentType: 'summarizer',
  },
]

const stats: SystemStats = {
  sessions: 12,
  agents: { total: 7, active: 1, idle: 6 },
  tasks: { pending: 0, active: 1 },
  budget: { used: 0.0047, limit: 10, percentage: 0.047 },
  rag: { totalDocuments: 12, totalChunks: 48, avgChunksPerDocument: 4 },
  telemetry: {
    routes: {
      total: 17,
      recent: [],
      breakdown: { rag: 9, summarizer: 5, verifier: 3 },
    },
    retrieval: {
      total: 24,
      averageTopScore: 0.72,
      averageRetrievalLatencyMs: 18,
      averageGenerationLatencyMs: 294,
      recent: [],
    },
    providers: {
      total: 24,
      breakdown: { groq: 24 },
      recent: [],
    },
    evals: {
      total: 3,
      recent: [],
    },
  },
  latestEval: null,
  uptime: 3600,
}

const recentEval: EvalRun = {
  id: 'eval-1',
  suiteId: 'baseline-document-qa',
  createdAt: new Date('2026-03-21T10:10:00Z').toISOString(),
  averageScore: 0.93,
  passedCases: 14,
  totalCases: 15,
  results: [
    {
      caseId: 'c1',
      title: 'Revenue summary',
      question: 'What happened in Q4?',
      answer: 'Revenue grew and churn fell.',
      score: 1,
      passed: true,
      matchedKeywords: ['revenue', 'churn'],
      missingKeywords: [],
      retrievalTimeMs: 18,
      generationTimeMs: 290,
      topScore: 0.84,
      tokensUsed: 182,
    },
    {
      caseId: 'c2',
      title: 'Regional sales',
      question: 'Which region led revenue?',
      answer: 'North led revenue.',
      score: 1,
      passed: true,
      matchedKeywords: ['north'],
      missingKeywords: [],
      retrievalTimeMs: 21,
      generationTimeMs: 301,
      topScore: 0.78,
      tokensUsed: 205,
    },
  ],
}

export default function ShowcaseInsightsPage() {
  const router = useRouter()
  return (
    <div className="h-screen flex bg-[#212121]">
      <Sidebar
        documents={documents}
        activeDocument="ops-update.txt"
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
      />
      <Chat
        messages={messages}
        isLoading={false}
        onSendMessage={() => undefined}
        hasDocument
        documentName="ops-update.txt"
        onNavigateHome={() => router.push('/', { scroll: true })}
      />
      <SystemInsightsPanel
        stats={stats}
        recentEval={recentEval}
        onRefresh={async () => undefined}
        onRunEval={async () => undefined}
        onClose={() => undefined}
        onNavigateHome={() => router.push('/', { scroll: true })}
      />
    </div>
  )
}
