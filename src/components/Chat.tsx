'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, Check, Sparkles, User, Paperclip, BookOpen, ChevronDown, ChevronUp, Search, Bot, CheckCircle, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  hasDocument: boolean
  documentName?: string
}

// Agent configuration with colors and labels
const AGENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  rag: { icon: <Search className="w-4 h-4" />, color: '#3b82f6', label: 'RAG Agent' },
  question: { icon: <Bot className="w-4 h-4" />, color: '#8b5cf6', label: 'Question Agent' },
  verifier: { icon: <CheckCircle className="w-4 h-4" />, color: '#f59e0b', label: 'Verifier Agent' },
  summarizer: { icon: <FileText className="w-4 h-4" />, color: '#ec4899', label: 'Summarizer Agent' },
  default: { icon: <Sparkles className="w-4 h-4" />, color: '#10a37f', label: 'AgentFlow' },
}

export function Chat({ messages, isLoading, onSendMessage, hasDocument, documentName }: ChatProps) {
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
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  // Determine which agent to show based on message content and context
  const getAgentForMessage = (message: Message): { icon: React.ReactNode; color: string; label: string } => {
    // If message has sources, it's from RAG
    if (message.sources && message.sources.length > 0) {
      return AGENT_CONFIG.rag
    }
    
    // If message has explicit agent type
    if (message.agentType && AGENT_CONFIG[message.agentType]) {
      return AGENT_CONFIG[message.agentType]
    }
    
    // Detect from content
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
    
    // Default based on whether there's a document
    return hasDocument ? AGENT_CONFIG.rag : AGENT_CONFIG.default
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 md:p-8">
            <div className="max-w-2xl w-full text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 bg-[#10a37f] flex items-center justify-center">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              
              <h1 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3 text-[#ececec]">
                {hasDocument ? `Analyzing ${documentName}` : 'How can I help you today?'}
              </h1>
              
              <p className="text-sm md:text-base text-[#b4b4b4] mb-6 md:mb-8 px-4">
                {hasDocument 
                  ? 'Ask any question about your document. I use RAG to find relevant information and cite sources.'
                  : 'I can help with coding, data analysis, writing, and general questions.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-lg mx-auto px-4">
                {[
                  hasDocument ? 'Summarize this document' : 'Explain a concept',
                  hasDocument ? 'What are the key metrics?' : 'Help me write code',
                  hasDocument ? 'Find trends in the data' : 'Analyze some data',
                  hasDocument ? 'Compare different values' : 'Answer a question',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => onSendMessage(prompt)}
                    className="p-3 text-left text-sm bg-[#2f2f2f] hover:bg-[#3a3a3a] border border-[#424242] text-[#ececec] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 md:py-6">
            {messages.map((message) => {
              const agentConfig = message.role === 'assistant' ? getAgentForMessage(message) : null
              
              return (
                <div
                  key={message.id}
                  className="animate-fade-in px-3 md:px-4 py-4 md:py-6 border-b border-[#424242] last:border-b-0"
                >
                  <div className="flex gap-3 md:gap-4">
                    {/* Avatar */}
                    <div 
                      className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: message.role === 'user' ? '#5436DA' : agentConfig?.color || '#10a37f' }}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      ) : (
                        <span className="text-white">{agentConfig?.icon || <Sparkles className="w-4 h-4" />}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm md:text-base text-[#ececec]">
                          {message.role === 'user' ? 'You' : agentConfig?.label || 'AgentFlow'}
                        </span>
                        {message.role === 'assistant' && agentConfig && agentConfig !== AGENT_CONFIG.default && (
                          <span 
                            className="text-xs px-2 py-0.5"
                            style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
                          >
                            {message.sources && message.sources.length > 0 ? 'RAG' : agentConfig.label.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      
                      <div className="prose text-sm md:text-base text-[#ececec]">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 md:mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 md:pl-5 mb-2 md:mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 md:pl-5 mb-2 md:mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-[#ececec]">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            code: ({ children, className }) => {
                              if (className?.includes('language-')) {
                                return (
                                  <pre className="bg-[#1a1a1a] p-3 md:p-4 overflow-x-auto my-2 md:my-3 text-xs md:text-sm">
                                    <code className="text-[#ececec]">{children}</code>
                                  </pre>
                                )
                              }
                              return (
                                <code className="bg-[#1a1a1a] px-1 md:px-1.5 py-0.5 text-xs md:text-sm text-[#ececec]">
                                  {children}
                                </code>
                              )
                            },
                            h1: ({ children }) => <h1 className="text-lg md:text-xl font-semibold mt-3 md:mt-4 mb-2 text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base md:text-lg font-semibold mt-3 md:mt-4 mb-2 text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm md:text-base font-semibold mt-2 md:mt-3 mb-2 text-white">{children}</h3>,
                          }}
                        >
                          {message.content || (message.isStreaming ? '...' : '')}
                        </ReactMarkdown>
                      </div>

                      {/* Actions */}
                      {message.role === 'assistant' && message.content && !message.isStreaming && (
                        <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-3 md:gap-4">
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                          >
                            {copiedId === message.id ? (
                              <><Check className="w-3.5 h-3.5" /> Copied</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copy</>
                            )}
                          </button>
                          
                          {/* RAG Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <button
                              onClick={() => toggleSources(message.id)}
                              className="flex items-center gap-1.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              {message.sources.length} sources
                              {expandedSources.has(message.id) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Expanded Sources */}
                      {message.sources && expandedSources.has(message.id) && (
                        <div className="mt-3 space-y-2">
                          {message.sources.map((source, idx) => (
                            <div 
                              key={idx}
                              className="p-2 md:p-3 bg-[#1a1a1a] border-l-2 border-[#3b82f6]"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-[#3b82f6]">
                                  Source {idx + 1}
                                </span>
                                <span className="text-xs text-[#8e8e8e]">
                                  {(source.score * 100).toFixed(0)}% match
                                </span>
                              </div>
                              <p className="text-xs text-[#b4b4b4] line-clamp-3">
                                {source.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="px-3 md:px-4 py-4 md:py-6 animate-fade-in">
                <div className="flex gap-3 md:gap-4">
                  <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 flex items-center justify-center bg-[#10a37f]">
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse"></div>
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-xs md:text-sm text-[#8e8e8e] ml-2">Processing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[#424242] p-3 md:p-4 bg-[#212121]">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="relative bg-[#2f2f2f] border border-[#424242] focus-within:border-[#10a37f]">
              {hasDocument && (
                <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1 flex items-center gap-2 text-xs text-[#b4b4b4]">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate">{documentName}</span>
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AgentFlow..."
                rows={1}
                className="w-full bg-transparent px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-[#ececec] resize-none focus:outline-none placeholder:text-[#8e8e8e] min-h-[44px] md:min-h-[52px] max-h-[200px]"
              />
              
              <div className="px-2 md:px-3 pb-2 md:pb-3 flex justify-between items-center">
                <span className="text-xs text-[#8e8e8e] hidden sm:block">
                  Enter to send · Shift+Enter for new line
                </span>
                <span className="text-xs text-[#8e8e8e] sm:hidden">
                  Enter to send
                </span>
                
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-[#10a37f] hover:bg-[#0d8a6a] disabled:bg-[#424242] disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
          
          <p className="text-xs text-[#8e8e8e] text-center mt-2 md:mt-3">
            Powered by Llama 3.3 70B with RAG
          </p>
        </div>
      </div>
    </div>
  )
}
