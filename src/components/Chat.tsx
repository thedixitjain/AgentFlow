'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Send, Loader2, Copy, Check, Upload, Sparkles, FileText, BarChart3, Search, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Message, DocumentFile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  activeDocument: string | null
  onFileUpload: (file: DocumentFile) => void
}

const SUGGESTIONS = {
  withDoc: [
    { icon: FileText, text: 'Summarize this document', color: 'blue' },
    { icon: BarChart3, text: 'Show key statistics', color: 'green' },
    { icon: Search, text: 'Find the most important points', color: 'purple' },
    { icon: Lightbulb, text: 'What insights can you extract?', color: 'amber' },
  ],
  withoutDoc: [
    { icon: FileText, text: 'Help me analyze a document', color: 'blue' },
    { icon: BarChart3, text: 'What file types do you support?', color: 'green' },
    { icon: Search, text: 'How can you help with data analysis?', color: 'purple' },
    { icon: Lightbulb, text: 'What are your capabilities?', color: 'amber' },
  ],
}

export function Chat({ messages, isLoading, onSendMessage, activeDocument, onFileUpload }: ChatProps) {
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

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[]
          onFileUpload({
            name: file.name,
            type: 'csv',
            size: file.size,
            data: data.filter(row => Object.values(row).some(v => v)),
            columns: results.meta.fields || [],
            uploadedAt: new Date(),
          })
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
      onFileUpload({
        name: file.name,
        type: 'xlsx',
        size: file.size,
        data,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        uploadedAt: new Date(),
      })
    } else if (ext === 'txt' || ext === 'md') {
      const text = await file.text()
      onFileUpload({
        name: file.name,
        type: 'txt',
        size: file.size,
        content: text,
        uploadedAt: new Date(),
      })
    } else if (ext === 'pdf') {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      const { text } = await res.json()
      onFileUpload({
        name: file.name,
        type: 'pdf',
        size: file.size,
        content: text || 'Could not extract PDF content',
        uploadedAt: new Date(),
      })
    } else if (ext === 'docx') {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-docx', { method: 'POST', body: formData })
      const { text } = await res.json()
      onFileUpload({
        name: file.name,
        type: 'docx',
        size: file.size,
        content: text || 'Could not extract DOCX content',
        uploadedAt: new Date(),
      })
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    noClick: true,
  })

  const suggestions = activeDocument ? SUGGESTIONS.withDoc : SUGGESTIONS.withoutDoc

  return (
    <div 
      {...getRootProps()}
      className={cn(
        "flex-1 flex flex-col h-full bg-[#0a0a0a] relative transition-colors",
        isDragActive && "bg-blue-500/5"
      )}
    >
      <input {...getInputProps()} />
      
      {/* Drag Overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-xl font-semibold">Drop your file here</p>
            <p className="text-sm text-zinc-500 mt-1">CSV, Excel, PDF, Word, or Text</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="max-w-lg w-full text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              
              <h1 className="text-2xl font-bold mb-3">
                {activeDocument ? 'Document Ready' : 'How can I help you?'}
              </h1>
              
              <p className="text-zinc-500 mb-8 leading-relaxed">
                {activeDocument 
                  ? `I'm ready to analyze your document. Ask me anything about it.`
                  : 'Upload a document to analyze, or just start chatting. I can help with data analysis, document summarization, and more.'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((item) => (
                  <button
                    key={item.text}
                    onClick={() => onSendMessage(item.text)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left group",
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      item.color === 'blue' && "bg-blue-500/10 group-hover:bg-blue-500/20",
                      item.color === 'green' && "bg-green-500/10 group-hover:bg-green-500/20",
                      item.color === 'purple' && "bg-purple-500/10 group-hover:bg-purple-500/20",
                      item.color === 'amber' && "bg-amber-500/10 group-hover:bg-amber-500/20",
                    )}>
                      <item.icon className={cn(
                        "w-4 h-4",
                        item.color === 'blue' && "text-blue-400",
                        item.color === 'green' && "text-green-400",
                        item.color === 'purple' && "text-purple-400",
                        item.color === 'amber' && "text-amber-400",
                      )} />
                    </div>
                    <span className="text-sm text-zinc-300">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 space-y-6">
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
                    'relative group max-w-[85%] rounded-2xl px-5 py-4',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                  )}
                >
                  <div className="prose prose-sm max-w-none prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                        code: ({ children, className }) => {
                          if (className?.includes('language-')) {
                            return (
                              <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto my-3 border border-zinc-800">
                                <code className="text-sm text-zinc-300">{children}</code>
                              </pre>
                            )
                          }
                          return (
                            <code className={cn(
                              'px-1.5 py-0.5 rounded text-sm font-mono',
                              message.role === 'user' ? 'bg-blue-700' : 'bg-zinc-800'
                            )}>
                              {children}
                            </code>
                          )
                        },
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full border border-zinc-800 rounded-lg overflow-hidden">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => <th className="px-4 py-2 bg-zinc-800 text-left text-sm font-semibold">{children}</th>,
                        td: ({ children }) => <td className="px-4 py-2 border-t border-zinc-800 text-sm">{children}</td>,
                      }}
                    >
                      {message.content || (message.isStreaming ? '...' : '')}
                    </ReactMarkdown>
                  </div>
                  
                  {message.role === 'assistant' && !message.isStreaming && message.content && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-zinc-800 border border-zinc-700 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all shadow-lg"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-zinc-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-900 p-4 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex items-end bg-zinc-900 rounded-2xl border border-zinc-800 focus-within:border-zinc-700 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeDocument ? `Ask about ${activeDocument}...` : 'Ask me anything...'}
                rows={1}
                className="flex-1 bg-transparent px-5 py-4 text-sm resize-none focus:outline-none placeholder:text-zinc-600 min-h-[56px] max-h-[150px]"
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="m-2 p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
          
          <p className="text-xs text-zinc-700 text-center mt-3">
            Powered by Llama 3.1 70B via Groq · Drag and drop files anywhere
          </p>
        </div>
      </div>
    </div>
  )
}
