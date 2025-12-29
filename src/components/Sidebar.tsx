'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Plus, FileText, FileSpreadsheet, X, Upload, Home, Zap, Clock, Trash2 } from 'lucide-react'
import { DocumentFile, ChatHistory } from '@/lib/types'
import { cn, formatFileSize } from '@/lib/utils'

interface SidebarProps {
  documents: DocumentFile[]
  activeDocument: string | null
  chatHistory: ChatHistory[]
  onFileUpload: (file: DocumentFile) => void
  onSelectDocument: (name: string) => void
  onRemoveDocument: (name: string) => void
  onNewChat: () => void
  onLoadChat: (chat: ChatHistory) => void
  onDeleteChat: (id: string) => void
  onBackToHome: () => void
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
    onDrop: (files) => files.forEach(processFile),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
  })

  return (
    <aside className="w-72 bg-[#111111] border-r border-zinc-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm">AgentFlow</span>
              <span className="text-[10px] text-zinc-600 block">AI Document Intelligence</span>
            </div>
          </div>
          <button
            onClick={onBackToHome}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
            title="Back to home"
          >
            <Home className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-zinc-900">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
            isDragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
          <p className="text-xs text-zinc-500 font-medium">
            {isDragActive ? 'Drop files here' : 'Upload files'}
          </p>
          <p className="text-[10px] text-zinc-700 mt-1">CSV, Excel, PDF, Word, TXT</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Documents */}
        {documents.length > 0 && (
          <div className="p-4 border-b border-zinc-900">
            <p className="text-xs text-zinc-600 font-medium mb-3 uppercase tracking-wider">Active Documents</p>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => onSelectDocument(doc.name)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
                    activeDocument === doc.name 
                      ? 'bg-blue-500/10 border border-blue-500/30' 
                      : 'hover:bg-zinc-900 border border-transparent'
                  )}
                >
                  {doc.type === 'csv' || doc.type === 'xlsx' ? (
                    <FileSpreadsheet className={cn(
                      "w-4 h-4 flex-shrink-0",
                      activeDocument === doc.name ? "text-blue-400" : "text-green-400"
                    )} />
                  ) : (
                    <FileText className={cn(
                      "w-4 h-4 flex-shrink-0",
                      activeDocument === doc.name ? "text-blue-400" : "text-zinc-400"
                    )} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{doc.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      {formatFileSize(doc.size)}
                      {doc.data && ` · ${doc.data.length.toLocaleString()} rows`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveDocument(doc.name)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-all"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="p-4">
            <p className="text-xs text-zinc-600 font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Recent Chats
            </p>
            <div className="space-y-1">
              {chatHistory.slice(0, 10).map((chat) => (
                <div
                  key={chat.id}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition-all"
                  onClick={() => onLoadChat(chat)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{chat.title}</p>
                    <p className="text-[10px] text-zinc-600">
                      {chat.messages.length} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900">
        <p className="text-[10px] text-zinc-700 text-center">
          Powered by Groq · Llama 3.1 70B
        </p>
      </div>
    </aside>
  )
}
