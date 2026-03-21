'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Plus, FileText, FileSpreadsheet, X, Upload, Home, MessageSquare, Trash2, BarChart3, Sparkles } from 'lucide-react'
import { DocumentFile, ChatHistory } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'

interface SidebarProps {
  documents: DocumentFile[]
  activeDocument: string | null
  chatHistory: ChatHistory[]
  currentChatId: string
  onFileUpload: (file: DocumentFile) => void
  onSelectDocument: (name: string) => void
  onRemoveDocument: (name: string) => void
  onNewChat: () => void
  onLoadChat: (chat: ChatHistory) => void
  onDeleteChat: (id: string) => void
  onBackToHome: () => void
  onOpenSystemInsights: () => void
}

export function Sidebar({
  documents,
  activeDocument,
  chatHistory,
  onFileUpload,
  onSelectDocument,
  onRemoveDocument,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  onBackToHome,
  onOpenSystemInsights,
  currentChatId,
}: SidebarProps) {
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
    } else if (ext === 'txt') {
      const text = await file.text()
      onFileUpload({
        name: file.name,
        type: 'txt',
        size: file.size,
        content: text,
        uploadedAt: new Date(),
      })
    } else if (ext === 'pdf') {
      // Parse PDF using API
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const result = await response.json()
          onFileUpload({
            name: file.name,
            type: 'pdf',
            size: file.size,
            content: result.text || 'PDF content could not be extracted.',
            uploadedAt: new Date(),
          })
        } else {
          onFileUpload({
            name: file.name,
            type: 'pdf',
            size: file.size,
            content: 'PDF parsing failed.',
            uploadedAt: new Date(),
          })
        }
      } catch {
        onFileUpload({
          name: file.name,
          type: 'pdf',
          size: file.size,
          content: 'PDF parsing error.',
          uploadedAt: new Date(),
        })
      }
    } else if (ext === 'docx' || ext === 'doc') {
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const response = await fetch('/api/parse-docx', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const result = await response.json()
          onFileUpload({
            name: file.name,
            type: 'docx',
            size: file.size,
            content: result.text || 'DOCX content could not be extracted.',
            uploadedAt: new Date(),
          })
        } else {
          onFileUpload({
            name: file.name,
            type: 'docx',
            size: file.size,
            content: 'DOCX parsing failed.',
            uploadedAt: new Date(),
          })
        }
      } catch {
        onFileUpload({
          name: file.name,
          type: 'docx',
          size: file.size,
          content: 'DOCX parsing error.',
          uploadedAt: new Date(),
        })
      }
    } else if (ext === 'pptx' || ext === 'ppt') {
      const text = await file.text().catch(() => '')
      onFileUpload({
        name: file.name,
        type: 'pptx',
        size: file.size,
        content: text || 'PowerPoint uploaded.',
        uploadedAt: new Date(),
      })
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(processFile),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/msword': ['.doc'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
  })

  return (
    <aside className="w-64 md:w-72 shrink-0 bg-[var(--sidebar-bg)] border-r border-white/[0.06] flex flex-col h-full">
      <div className="p-3 pb-2 border-b border-white/[0.05]">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onBackToHome()
          }}
          className="group flex items-center gap-2 px-1 mb-2 w-full text-left rounded-lg py-1 -mx-0.5 hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)] cursor-pointer relative z-20"
          aria-label="AgentFlow, go to landing page"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] flex items-center justify-center shrink-0 transition-transform group-hover:scale-[1.02]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-zinc-100 leading-tight">AgentFlow</p>
            <p className="text-[10px] text-zinc-500 leading-snug group-hover:text-zinc-400">RAG workspace</p>
          </div>
        </Link>
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onBackToHome()
          }}
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors text-left cursor-pointer relative z-20"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Back to landing</span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-3 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6a] text-white text-sm font-medium transition-colors shadow-md shadow-[#10a37f]/15"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onOpenSystemInsights}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 text-sm font-medium transition-colors border border-white/[0.06]"
        >
          <BarChart3 className="w-4 h-4" />
          System Insights
        </button>
      </div>

      {/* Upload Area */}
      <div className="px-3 pb-3">
        <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
          Data
        </p>
        <div
          {...getRootProps()}
          className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-[#10a37f] bg-[#10a37f]/10' 
              : 'border-white/[0.12] hover:border-[#10a37f]/40 bg-zinc-900/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-5 h-5 mx-auto mb-2 text-zinc-500" />
          <p className="text-xs text-zinc-400 font-medium">
            {isDragActive ? 'Drop file here' : 'Upload CSV, Excel, PDF, TXT'}
          </p>
          <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
            Indexed on the server for retrieval
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
              Active files
            </p>
            <div className="space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => onSelectDocument(doc.name)}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${
                    activeDocument === doc.name 
                      ? 'bg-[#10a37f]/12 border-[#10a37f]/25 text-zinc-100' 
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                  }`}
                >
                  {doc.type === 'csv' || doc.type === 'xlsx' ? (
                    <FileSpreadsheet className="w-4 h-4 text-[#10a37f] flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#b4b4b4] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-[#8e8e8e]">
                      {formatFileSize(doc.size)}
                      {doc.data && ` · ${doc.data.length} rows`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveDocument(doc.name)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#424242] transition-all"
                  >
                    <X className="w-3 h-3 text-[#8e8e8e]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1 px-1">
              Sessions
            </p>
            <p className="text-[9px] text-zinc-600 mb-2 px-1 leading-relaxed">
              Only for this browser. Other visitors get their own list (not one shared public feed).
            </p>
            <div className="space-y-1">
              {chatHistory.slice(0, 10).map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${
                    currentChatId === chat.id
                      ? 'bg-[#10a37f]/10 border-[#10a37f]/20 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                  }`}
                  onClick={() => onLoadChat(chat)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{chat.title}</p>
                    <p className="text-xs text-[#8e8e8e]">
                      {chat.messages.length} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#424242] transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-[#8e8e8e]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
          Sessions & vectors stored on the API · Groq inference
        </p>
      </div>
    </aside>
  )
}
