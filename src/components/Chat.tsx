'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Copy, Check, Sparkles, User, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  hasDocument: boolean
  documentName?: string
}

export function Chat({ messages, isLoading, onSendMessage, hasDocument, documentName }: ChatProps) {
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#212121]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#10a37f] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-semibold mb-3 text-[#ececec]">
                {hasDocument ? `Analyzing ${documentName}` : 'How can I help you today?'}
              </h1>
              
              <p className="text-[#b4b4b4] mb-8">
                {hasDocument 
                  ? 'Ask any question about your document. I can analyze data, find patterns, and provide insights.'
                  : 'I can help with coding, data analysis, writing, and general questions.'}
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
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
          <div className="max-w-3xl mx-auto py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className="animate-fade-in px-4 py-6 border-b border-[#424242] last:border-b-0"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-[#5436DA]' 
                      : 'bg-[#10a37f]'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#ececec]">
                        {message.role === 'user' ? 'You' : 'AgentFlow'}
                      </span>
                      {message.role === 'assistant' && hasDocument && (
                        <span className="text-xs px-2 py-0.5 bg-[#10a37f]/20 text-[#10a37f]">
                          Data Analyst
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
                          h1: ({ children }) => <h1 className="text-xl font-semibold mt-4 mb-2 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 text-white">{children}</h3>,
                        }}
                      >
                        {message.content || (message.isStreaming ? '...' : '')}
                      </ReactMarkdown>
                    </div>

                    {/* Copy button for assistant messages */}
                    {message.role === 'assistant' && message.content && !message.isStreaming && (
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="px-4 py-6 animate-fade-in">
                <div className="flex gap-4">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#10a37f]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse"></div>
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-[#10a37f] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
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
                placeholder="Message AgentFlow..."
                rows={1}
                className="w-full bg-transparent px-4 py-3 text-[#ececec] resize-none focus:outline-none placeholder:text-[#8e8e8e] min-h-[52px] max-h-[200px]"
              />
              
              <div className="px-3 pb-3 flex justify-between items-center">
                <span className="text-xs text-[#8e8e8e]">
                  Press Enter to send, Shift+Enter for new line
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
          
          <p className="text-xs text-[#8e8e8e] text-center mt-3">
            AgentFlow uses Llama 3.3 70B. Responses may not always be accurate.
          </p>
        </div>
      </div>
    </div>
  )
}
