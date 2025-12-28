'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Copy, Check, FileText, BarChart2, MessageSquare, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  hasDocument: boolean
}

const PROMPTS = [
  { icon: FileText, text: 'Summarize this document' },
  { icon: BarChart2, text: 'Show key metrics' },
  { icon: MessageSquare, text: 'What are the main points?' },
  { icon: Zap, text: 'Find insights' },
]

export function Chat({ messages, isLoading, onSendMessage, hasDocument }: ChatProps) {
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
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

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              <div className="w-12 h-12 mx-auto mb-6 bg-zinc-900 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">
                {hasDocument ? 'Document Ready' : 'How can I help?'}
              </h1>
              
              <p className="text-zinc-500 mb-8">
                {hasDocument 
                  ? 'Ask any question about your document'
                  : 'Upload a document or start chatting'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => onSendMessage(prompt.text)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left text-sm"
                  >
                    <prompt.icon className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-300">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'animate-fade-in',
                  message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                )}
              >
                <div
                  className={cn(
                    'relative group max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 text-zinc-100'
                  )}
                >
                  <div className={cn('prose prose-sm max-w-none', message.role === 'user' && 'prose-invert')}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children, className }) => {
                          if (className?.includes('language-')) {
                            return (
                              <pre className="bg-black rounded-lg p-3 overflow-x-auto my-2">
                                <code className="text-sm text-zinc-300">{children}</code>
                              </pre>
                            )
                          }
                          return (
                            <code className={cn(
                              'px-1 py-0.5 rounded text-sm',
                              message.role === 'user' ? 'bg-blue-700' : 'bg-zinc-800'
                            )}>
                              {children}
                            </code>
                          )
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-zinc-900 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-900 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end bg-zinc-900 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasDocument ? 'Ask about your document...' : 'Message AgentFlow...'}
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-zinc-600 min-h-[48px] max-h-[150px]"
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="m-2 p-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          <p className="text-xs text-zinc-700 text-center mt-3">
            Powered by Llama 3.1 70B
          </p>
        </div>
      </div>
    </div>
  )
}
