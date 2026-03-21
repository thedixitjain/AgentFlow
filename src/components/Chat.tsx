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
  Info,
  ArrowRight,
} from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  hasDocument: boolean
  documentName?: string
  /** Backend session id, shown so visitors understand state is persisted */
  sessionId?: string
  /** Return to main landing (top); same as sidebar logo */
  onNavigateHome?: () => void
}

const AGENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  rag: { icon: <Search className="w-4 h-4" />, color: '#3b82f6', label: 'RAG Agent' },
  question: { icon: <Bot className="w-4 h-4" />, color: '#8b5cf6', label: 'Question Agent' },
  verifier: { icon: <CheckCircle className="w-4 h-4" />, color: '#f59e0b', label: 'Verifier Agent' },
  summarizer: { icon: <FileText className="w-4 h-4" />, color: '#ec4899', label: 'Summarizer Agent' },
  default: { icon: <Image src="/logo.png" alt="AF" width={16} height={16} />, color: '#10a37f', label: 'AgentFlow' },
}

export function Chat({
  messages,
  isLoading,
  onSendMessage,
  hasDocument,
  documentName,
  sessionId,
  onNavigateHome,
}: ChatProps) {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
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
    if (message.sources && message.sources.length > 0) {
      return AGENT_CONFIG.rag
    }
    if (message.agentType && AGENT_CONFIG[message.agentType]) {
      return AGENT_CONFIG[message.agentType]
    }
    const content = message.content.toLowerCase()
    if (content.includes('summary') || content.includes('summarize') || content.includes('key points')) {
      return AGENT_CONFIG.summarizer
    }
    if (content.includes('verified') || content.includes('confirm') || content.includes('fact')) {
      return AGENT_CONFIG.verifier
    }
    if (content.includes('[source') || content.includes('according to')) {
      return AGENT_CONFIG.rag
    }
    return hasDocument ? AGENT_CONFIG.rag : AGENT_CONFIG.default
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--chat-bg)] min-w-0">
      {/* Explainer header: what this screen is */}
      <header className="shrink-0 border-b border-white/[0.06] bg-zinc-950/80 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {onNavigateHome && (
                  <>
                    <button
                      type="button"
                      onClick={onNavigateHome}
                      className="font-display text-sm font-semibold text-[#10a37f] hover:text-[#5eead4] transition-colors cursor-pointer"
                      aria-label="AgentFlow, go to landing page"
                    >
                      AgentFlow
                    </button>
                    <span className="text-zinc-600 text-sm" aria-hidden>
                      /
                    </span>
                  </>
                )}
                <h2 className="font-display text-sm font-semibold text-zinc-100 tracking-tight">
                  Chat workspace
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-xl">
                Your file is chunked and embedded on the server. Each question can trigger{' '}
                <span className="text-zinc-400">retrieval (RAG)</span>, then an{' '}
                <span className="text-zinc-400">LLM answer</span>. Badges show which agent handled the
                reply.
              </p>
            </div>
            {sessionId && (
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/80 px-2 py-1 rounded border border-white/[0.06] shrink-0 self-start">
                Session · {sessionId.slice(0, 8)}…
              </div>
            )}
          </div>

          <div
            className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
              hasDocument
                ? 'bg-[#10a37f]/10 border border-[#10a37f]/25 text-zinc-300'
                : 'bg-amber-950/40 border border-amber-500/20 text-amber-100/90'
            }`}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#10a37f]" />
            <div>
              {hasDocument ? (
                <>
                  <span className="font-medium text-zinc-200">Active document: </span>
                  <span className="text-zinc-400">{documentName}</span>
                  <span className="text-zinc-500">. Answers can cite retrieved passages.</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-amber-200/95">No document in this chat yet. </span>
                  <span className="text-amber-100/70">
                    Use the left panel to upload CSV, Excel, PDF, or text so answers are grounded in
                    your data.
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-lg w-full">
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl overflow-hidden shadow-lg shadow-[#10a37f]/20">
                  <Image src="/logo.png" alt="AgentFlow" width={56} height={56} className="object-cover" />
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-semibold text-zinc-100 mb-2">
                  {hasDocument ? `Ready to analyze “${documentName}”` : 'Start the demo'}
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {hasDocument
                    ? 'Type a question below or pick a starter. The backend will search your document, then stream a reply.'
                    : 'Upload a file in the sidebar first, or ask a general question to see how routing works.'}
                </p>
              </div>

              <ol className="space-y-3 mb-8 text-left">
                {[
                  { n: '1', t: 'Add data', d: 'Upload or select a document in the left panel.' },
                  { n: '2', t: 'Ask in English', d: 'Sales, finance, ops, same as you’d ask a colleague.' },
                  { n: '3', t: 'Read the reply', d: 'Expand “sources” when RAG cites chunks from your file.' },
                ].map((row) => (
                  <li
                    key={row.n}
                    className="flex gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-4 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#10a37f]/20 text-xs font-bold text-[#10a37f]">
                      {row.n}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{row.t}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{row.d}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-[11px] uppercase tracking-wider text-zinc-600 text-center mb-3">
                Suggested prompts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  hasDocument ? 'Summarize this report for leadership' : 'Summarize a business update',
                  hasDocument ? 'What are the key metrics?' : 'Analyze a sales spreadsheet',
                  hasDocument ? 'Find trends in the data' : 'Compare regional performance',
                  hasDocument ? 'What risks or anomalies stand out?' : 'Extract action items from a report',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSendMessage(prompt)}
                    className="group flex items-center gap-2 p-3 text-left text-sm rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.08] text-zinc-200 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 text-[#10a37f] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="leading-snug">{prompt}</span>
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
                            ? 'RAG · sources below'
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
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
                            ),
                            li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">{children}</strong>
                            ),
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
                            h1: ({ children }) => (
                              <h1 className="text-base font-semibold mt-3 mb-2 text-white">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-semibold mt-3 mb-2 text-white">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold mt-2 mb-1 text-zinc-100">{children}</h3>
                            ),
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
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </>
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
                            {expandedSources.has(message.id) ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {message.sources && expandedSources.has(message.id) && (
                      <div className="mt-3 space-y-2 w-full">
                        {message.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-blue-500/25 bg-blue-950/20 p-3 text-left"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-blue-400">
                                Source {idx + 1}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {(source.score * 100).toFixed(0)}% match
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed">
                              {source.content}
                            </p>
                          </div>
                        ))}
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
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </span>
                  <span className="text-xs text-zinc-500">Retrieving & generating…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-[var(--chat-bg)] p-3 sm:p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl bg-zinc-900/90 border border-white/[0.08] focus-within:border-[#10a37f]/45 focus-within:ring-2 focus-within:ring-[#10a37f]/15 transition-shadow">
              {hasDocument && documentName && (
                <div className="px-4 pt-3 pb-0 flex items-center gap-2 text-xs text-zinc-500 border-b border-white/[0.04] pb-2 mb-1">
                  <Paperclip className="w-3.5 h-3.5 text-[#10a37f]" />
                  <span className="truncate">
                    Context: <span className="text-zinc-400">{documentName}</span>
                  </span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasDocument
                    ? `Ask something about this document…`
                    : 'Ask a question, or upload a document in the sidebar…'
                }
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-sm sm:text-base text-zinc-100 resize-none focus:outline-none placeholder:text-zinc-600 min-h-[48px] max-h-[200px]"
              />

              <div className="px-3 pb-3 flex justify-between items-center gap-2">
                <span className="text-[11px] text-zinc-600 hidden sm:inline">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Enter</kbd> send ·{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Shift+Enter</kbd>{' '}
                  new line
                </span>
                <span className="text-[11px] text-zinc-600 sm:hidden">Enter to send</span>

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6a] disabled:bg-zinc-700 disabled:cursor-not-allowed text-white transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          <p className="text-[11px] text-zinc-600 text-center mt-2.5 leading-relaxed">
            Backend: Groq + RAG retrieval · Labels reflect the agent path ·{' '}
            <span className="text-zinc-500">Open System Insights in the sidebar for metrics</span>
          </p>
        </div>
      </div>
    </div>
  )
}
