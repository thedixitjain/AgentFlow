'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, Check, Sparkles, User, Paperclip, Bot, Database, CheckCircle, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentType?: string
  timestamp: Date
  isStreaming?: boolean
}

interface AgentChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  hasDocument: boolean
  documentName?: string
}

const AGENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  orchestrator: { icon: <Sparkles className="w-4 h-4" />, color: '#10a37f', label: 'Orchestrator' },
  ingest: { icon: <Database className="w-4 h-4" />, color: '#3b82f6', label: 'Ingest Agent' },
  question: { icon: <Bot className="w-4 h-4" />, color: '#8b5cf6', label: 'Question Agent' },
  verifier: { icon: <CheckCircle className="w-4 h-4" />, color: '#f59e0b', label: 'Verifier Agent' },
  summarizer: { icon: <FileText className="w-4 h-4" />, color: '#ec4899', label: 'Summarizer Agent' },
}

export function AgentChat({ messages, isLoading, onSendMessage, hasDocument, documentName }: AgentChatProps) {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
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

  const getAgentConfig = (agentType?: string) => {
    return AGENT_CONFIG[agentType || 'question'] || AGENT_CONFIG.question
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#10a37f] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-semibold mb-3 text-[#ececec]">
                Multi-Agent AI System
              </h1>
              
              <p className="text-[#b4b4b4] mb-8">
                Your questions are routed to specialized agents for optimal responses.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-8">
                {Object.entries(AGENT_CONFIG).slice(1).map(([type, config]) => (
                  <div key={type} className="p-3 bg-[#2f2f2f] border border-[#424242] text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div style={{ color: config.color }}>{config.icon}</div>
                      <span className="text-sm font-medium text-[#ececec]">{config.label}</span>
                    </div>
                    <p className="text-xs text-[#8e8e8e]">
                      {type === 'ingest' && 'Processes and analyzes documents'}
                      {type === 'question' && 'Answers questions accurately'}
                      {type === 'verifier' && 'Verifies claims and facts'}
                      {type === 'summarizer' && 'Creates concise summaries'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  'Summarize this document',
                  'What are the key metrics?',
                  'Verify this claim',
                  'Find trends in the data',
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
          <div className="max-w-3xl mx-auto py-6">
            {messages.map((message) => {
              const agentConfig = getAgentConfig(message.agentType)
              
              return (
                <div
                  key={message.id}
                  className="animate-fade-in px-4 py-6 border-b border-[#424242] last:border-b-0"
                >
                  <div className="flex gap-4">
                    <div 
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: message.role === 'user' ? '#5436DA' : agentConfig.color }}
                    >
                      {message.role === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white">{agentConfig.icon}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#ececec]">
                          {message.role === 'user' ? 'You' : agentConfig.label}
                        </span>
                        {message.role === 'assistant' && message.agentType && (
                          <span 
                            className="text-xs px-2 py-0.5"
                            style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
                          >
                            {message.agentType}
                          </span>
                        )}
                      </div>
                      
                      <div className="prose text-[#ececec]">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-[#ececec]">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            code: ({ children, className }) => {
                              if (className?.includes('language-')) {
                                return (
                                  <pre className="bg-[#1a1a1a] p-4 overflow-x-auto my-3 text-sm">
                                    <code className="text-[#ececec]">{children}</code>
                                  </pre>
                                )
                              }
                              return (
                                <code className="bg-[#1a1a1a] px-1.5 py-0.5 text-sm text-[#ececec]">
                                  {children}
                                </code>
                              )
                            },
                          }}
                        >
                          {message.content || (message.isStreaming ? '...' : '')}
                        </ReactMarkdown>
                      </div>

                      {message.role === 'assistant' && message.content && !message.isStreaming && (
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="mt-3 flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                        >
                          {copiedId === message.id ? (
                            <><Check className="w-3.5 h-3.5" /> Copied</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="px-4 py-6 animate-fade-in">
                <div className="flex gap-4">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#10a37f]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" />
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="text-sm text-[#8e8e8e] ml-2">Routing to agent...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#424242] p-4 bg-[#212121]">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="relative bg-[#2f2f2f] border border-[#424242] focus-within:border-[#10a37f]">
              {hasDocument && (
                <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs text-[#b4b4b4]">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{documentName}</span>
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... Your query will be routed to the best agent."
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-[#ececec] resize-none focus:outline-none placeholder:text-[#8e8e8e] min-h-[52px] max-h-[200px]"
              />
              
              <div className="px-3 pb-3 flex justify-between items-center">
                <span className="text-xs text-[#8e8e8e]">
                  Enter to send · Shift+Enter for new line
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
        </div>
      </div>
    </div>
  )
}
