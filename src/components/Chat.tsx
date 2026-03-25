'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Copy,
  Check,
  User,
  Paperclip,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  Bot,
  CheckCircle,
  FileText,
  ClipboardList,
  PanelLeft,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'
import { normalizeChatInput, toReadableDocumentName } from '@/lib/businessUx'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  onRetryMessage?: (message: string) => void
  onOpenReport?: () => void
  reportCount?: number
  isGeneratingReport?: boolean
  hasDocument: boolean
  documentName?: string
  /** Return to main landing */
  onNavigateHome?: () => void
  onOpenSidebar?: () => void
}

const AGENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  rag:       { icon: <Search className="w-4 h-4" />,        color: '#3b82f6', label: 'Document Assistant' },
  question:  { icon: <Bot className="w-4 h-4" />,           color: '#8b5cf6', label: 'Assistant' },
  verifier:  { icon: <CheckCircle className="w-4 h-4" />,   color: '#f59e0b', label: 'Review Assistant' },
  summarizer:{ icon: <FileText className="w-4 h-4" />,      color: '#ec4899', label: 'Summary Assistant' },
  default:   { icon: <Image src="/logo.png" alt="AF" width={16} height={16} />, color: '#10a37f', label: 'AgentFlow' },
}

const SUGGESTED_PROMPTS_WITH_DOC  = ['Summarize for leadership', 'What should I prioritize?', 'Key trends and risks', 'Action items']
const SUGGESTED_PROMPTS_NO_DOC    = ["Summarize last week's numbers", 'Biggest risks in this data', 'Compare regions', 'Top action items']

export function Chat({
  messages,
  isLoading,
  onSendMessage,
  onRetryMessage,
  onOpenReport,
  reportCount = 0,
  isGeneratingReport = false,
  hasDocument,
  documentName,
  onNavigateHome,
  onOpenSidebar,
}: ChatProps) {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeDocumentLabel = toReadableDocumentName(documentName)
  const sendableMessage = normalizeChatInput(input, isLoading)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sendableMessage) return
    onSendMessage(sendableMessage)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  const getAgentForMessage = (message: Message): { icon: React.ReactNode; color: string; label: string } => {
    if (message.sources && message.sources.length > 0) return AGENT_CONFIG.rag
    if (message.agentType && AGENT_CONFIG[message.agentType]) return AGENT_CONFIG[message.agentType]
    const content = message.content.toLowerCase()
    if (content.includes('summary') || content.includes('summarize') || content.includes('key points')) return AGENT_CONFIG.summarizer
    if (content.includes('verified') || content.includes('confirm') || content.includes('fact')) return AGENT_CONFIG.verifier
    if (content.includes('[source') || content.includes('according to')) return AGENT_CONFIG.rag
    return hasDocument ? AGENT_CONFIG.rag : AGENT_CONFIG.default
  }

  const suggestedPrompts = hasDocument ? SUGGESTED_PROMPTS_WITH_DOC : SUGGESTED_PROMPTS_NO_DOC

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--chat-bg)] min-w-0">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.06] bg-zinc-950/80 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            {onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:hidden"
                aria-label="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-sm font-medium text-[#10a37f] hover:text-[#5eead4] transition-colors"
                aria-label="Back to landing"
              >
                AgentFlow
              </button>
            )}
            <span className="text-zinc-700 text-sm hidden sm:inline" aria-hidden>/</span>
            <h1 className="text-sm font-medium text-zinc-200 tracking-tight truncate">
              Chat
              {hasDocument && (
                <span className="text-zinc-600 font-normal">
                  {' · '}<span className="text-zinc-400">{activeDocumentLabel}</span>
                </span>
              )}
            </h1>
          </div>

          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-800/60"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#10a37f]" />
              {isGeneratingReport ? 'Generating…' : reportCount > 0 ? `Brief (${reportCount})` : 'Brief'}
            </button>
          )}
        </div>
      </header>

      {/* ─── Messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 sm:p-10">
            <div className="max-w-md w-full text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-xl overflow-hidden opacity-90 shadow-lg shadow-[#10a37f]/15">
                <Image src="/logo.png" alt="" width={40} height={40} className="object-cover" />
              </div>

              <p className="text-sm font-medium text-zinc-200">
                {hasDocument
                  ? `Ready to analyze ${activeDocumentLabel}`
                  : 'Upload a file or try a sample template'}
              </p>
              <p className="mt-1.5 text-xs text-zinc-600">
                {hasDocument
                  ? 'Ask anything—your query is routed to the best agent.'
                  : 'Add a document from the sidebar to ground your answers.'}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-white/[0.07] hover:bg-white/[0.05] transition-colors"
                  >
                    {prompt}
                    <ArrowRight className="w-3 h-3 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
            {messages.map((message) => {
              const agentConfig = message.role === 'assistant' ? getAgentForMessage(message) : null
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  className={`animate-fade-in mb-6 sm:mb-8 flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-xl shadow-sm"
                    style={{
                      backgroundColor: isUser ? '#5b4bce' : agentConfig?.color || '#10a37f',
                    }}
                  >
                    {isUser ? (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <span className="text-white ring-1 ring-white/10 rounded overflow-hidden">
                        {agentConfig?.icon || <Image src="/logo.png" alt="AF" width={20} height={20} />}
                      </span>
                    )}
                  </div>

                  <div className={`min-w-0 flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-zinc-200">
                        {isUser ? 'You' : agentConfig?.label || 'AgentFlow'}
                      </span>
                      {!isUser && agentConfig && agentConfig !== AGENT_CONFIG.default && (
                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md font-medium"
                          style={{
                            backgroundColor: `${agentConfig.color}18`,
                            color: agentConfig.color,
                          }}
                        >
                          {message.sources && message.sources.length > 0
                            ? 'Grounded'
                            : agentConfig.label}
                        </span>
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm sm:text-[15px] leading-relaxed ${
                        isUser
                          ? 'bg-zinc-800/90 border border-white/[0.07] text-zinc-100 max-w-[95%] sm:max-w-[85%]'
                          : 'bg-zinc-900/70 border border-white/[0.06] text-zinc-200 w-full'
                      }`}
                    >
                      <div className="text-sm sm:text-[15px] leading-relaxed text-zinc-200 [&_a]:text-[#5eead4] [&_a]:underline">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            code: ({ children, className }) => {
                              if (className?.includes('language-')) {
                                return (
                                  <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto my-2 text-xs">
                                    <code className="text-zinc-200">{children}</code>
                                  </pre>
                                )
                              }
                              return (
                                <code className="bg-black/35 px-1.5 py-0.5 rounded text-xs text-[#a5e3d5]">
                                  {children}
                                </code>
                              )
                            },
                            h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-2 text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-2 text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-zinc-100">{children}</h3>,
                          }}
                        >
                          {message.content || (message.isStreaming ? '…' : '')}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {!isUser && message.role === 'assistant' && message.content && !message.isStreaming && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                          {copiedId === message.id ? (
                            <><Check className="w-3.5 h-3.5" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy</>
                          )}
                        </button>

                        {message.sources && message.sources.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleSources(message.id)}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {message.sources.length} source{message.sources.length === 1 ? '' : 's'}
                            {expandedSources.has(message.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    )}

                    {message.sources && expandedSources.has(message.id) && (
                      <div className="mt-3 space-y-2 w-full">
                        {message.sources.map((source, idx) => (
                          <div
                            key={`${message.id}-${source.chunkIndex ?? idx}-${source.score}`}
                            className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-left"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-blue-400">Source {idx + 1}</span>
                              <span className="text-[10px] text-zinc-600">{(source.score * 100).toFixed(0)}% match</span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed">{source.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isUser && message.canRetry && message.retryPrompt && onRetryMessage && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => message.retryPrompt && onRetryMessage(message.retryPrompt)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800/80 disabled:opacity-60"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 sm:gap-4 animate-fade-in mb-6">
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-800 border border-white/10 overflow-hidden">
                  <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-cover opacity-80" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </span>
                  <span className="text-xs text-zinc-500">Routing to agent…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Input ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[var(--chat-bg)] p-3 sm:p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl bg-zinc-900/90 border border-white/[0.08] focus-within:border-[#10a37f]/45 focus-within:ring-2 focus-within:ring-[#10a37f]/12 transition-shadow">
              {hasDocument && documentName && (
                <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-zinc-600 border-b border-white/[0.04]">
                  <Paperclip className="w-3.5 h-3.5 text-[#10a37f]" />
                  <span className="truncate">
                    Context: <span className="text-zinc-400">{activeDocumentLabel}</span>
                  </span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasDocument ? 'Ask anything about your document…' : 'Upload a file in the sidebar to ground answers…'}
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-sm sm:text-base text-zinc-100 resize-none focus:outline-none placeholder:text-zinc-600 min-h-[48px] max-h-[200px]"
              />

              <div className="px-3 pb-3 flex justify-end items-center">
                <button
                  type="submit"
                  disabled={!sendableMessage}
                  className="p-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6a] disabled:bg-zinc-800 disabled:cursor-not-allowed text-white transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
