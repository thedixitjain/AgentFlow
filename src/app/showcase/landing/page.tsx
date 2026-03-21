'use client'

import { Landing } from '@/components/Landing'
import type { ChatHistory } from '@/lib/types'

const recentChats: ChatHistory[] = [
  {
    id: 'demo-1',
    title: 'Q4 revenue analysis',
    messages: [],
    createdAt: new Date('2026-03-21T10:00:00Z'),
    updatedAt: new Date('2026-03-21T10:05:00Z'),
  },
  {
    id: 'demo-2',
    title: 'Operations risk summary',
    messages: [],
    createdAt: new Date('2026-03-20T09:00:00Z'),
    updatedAt: new Date('2026-03-20T09:10:00Z'),
  },
]

export default function ShowcaseLandingPage() {
  return (
    <Landing
      onStart={() => undefined}
      onFileUpload={() => undefined}
      recentChats={recentChats}
      onLoadChat={() => undefined}
    />
  )
}
