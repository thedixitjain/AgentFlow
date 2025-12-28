'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Database, FileText, Bot } from 'lucide-react'
import { Button } from './ui/Button'
import { ChatMessage, AgentType } from '@/lib/agents/types'
import { cn } from '@/lib/utils'
import { ChartDisplay } from './ChartDisplay'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isProcessing: boolean
}

const agentConfig: Record<AgentType, { icon: typeof Bot; label: string; className: string }> = {
  data: { icon: Database, label: 'Data Intelligence', className: 'agent-data' },
  research: { icon: FileText, label: 'Research Assistant', className: 'agent-research' },
  orchestrator: { icon: Bot, label: 'Orchestrator', className: 'agent-orchestrator' },
}

export function ChatInterface({ messages, onSendMessage, isProcessing }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleQuickAction = (query: string) => {
    if (!isProcessing) {
      onSendMessage(query)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState onQuickAction={handleQuickAction} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {isProcessing && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl animate-pulse">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-600 animate-spin" />
            </div>
            <div className="loading-dots flex gap-1">
              <span className="w-2 h-2 bg-primary-400 rounded-full" />
              <span className="w-2 h-2 bg-primary-400 rounded-full" />
              <span className="w-2 h-2 bg-primary-400 rounded-full" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data or documents..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            disabled={isProcessing}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.type === 'user'
  const agent = message.agent ? agentConfig[message.agent] : null

  return (
    <div className={cn('flex gap-3 message-enter', isUser ? 'flex-row-reverse' : '')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-primary-100' : 'bg-gray-100'
      )}>
        {isUser ? (
          <span className="text-sm font-medium text-primary-600">U</span>
        ) : agent ? (
          <agent.icon className="w-4 h-4 text-gray-600" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600" />
        )}
      </div>

      <div className={cn(
        'max-w-[80%] rounded-xl p-4',
        isUser
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 text-gray-800'
      )}>
        {!isUser && agent && (
          <div className={cn('agent-badge mb-2', agent.className)}>
            <agent.icon className="w-3 h-3" />
            {agent.label}
          </div>
        )}
        
        <div className="prose prose-sm max-w-none">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={cn('mb-1 last:mb-0', isUser && 'text-white')}>
              {formatMessageContent(line)}
            </p>
          ))}
        </div>

        {message.chart && (
          <div className="mt-4">
            <ChartDisplay chart={message.chart} />
          </div>
        )}

        {message.data && !message.chart && (
          <div className="mt-3 p-3 bg-white/10 rounded-lg">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(message.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function formatMessageContent(text: string): React.ReactNode {
  // Simple markdown-like formatting
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function EmptyState({ onQuickAction }: { onQuickAction: (query: string) => void }) {
  const quickActions = [
    { label: 'What is the total revenue?', icon: Database },
    { label: 'Plot sales by category', icon: Database },
    { label: 'Summarize the document', icon: FileText },
    { label: 'Extract key topics', icon: FileText },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-violet-100 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary-600" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Ready to Analyze
      </h3>
      <p className="text-gray-500 mb-8 max-w-md">
        Upload a file and ask questions in natural language. I'll route your query to the right AI agent.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => onQuickAction(action.label)}
            className="flex items-center gap-2 p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <action.icon className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
