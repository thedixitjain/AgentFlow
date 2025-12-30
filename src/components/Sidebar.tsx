'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Plus, FileText, FileSpreadsheet, X, Upload, Home, MessageSquare, Trash2 } from 'lucide-react'
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
      onFileUpload({
        name: file.name,
        type: 'pdf',
        size: file.size,
        content: 'PDF document',
        uploadedAt: new Date(),
      })
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(processFile),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
  })

  return (
    <aside className="w-64 bg-[#171717] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#b4b4b4] hover:text-[#ececec] hover:bg-[#2f2f2f] transition-colors w-full"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#10a37f] hover:bg-[#0d8a6a] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Upload Area */}
      <div className="px-3 pb-3">
        <div
          {...getRootProps()}
          className={`border border-dashed p-4 text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-[#10a37f] bg-[#10a37f]/10' 
              : 'border-[#424242] hover:border-[#8e8e8e]'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-5 h-5 mx-auto mb-2 text-[#8e8e8e]" />
          <p className="text-xs text-[#8e8e8e]">
            {isDragActive ? 'Drop file here' : 'Upload CSV, Excel, PDF, TXT'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <p className="text-xs text-[#8e8e8e] mb-2 px-1 uppercase tracking-wide">Documents</p>
            <div className="space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => onSelectDocument(doc.name)}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all ${
                    activeDocument === doc.name 
                      ? 'bg-[#2f2f2f] text-[#ececec]' 
                      : 'text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececec]'
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
            <p className="text-xs text-[#8e8e8e] mb-2 px-1 uppercase tracking-wide">Recent Chats</p>
            <div className="space-y-1">
              {chatHistory.slice(0, 10).map((chat) => (
                <div
                  key={chat.id}
                  className="group flex items-center gap-2 px-3 py-2 text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececec] cursor-pointer transition-all"
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
      <div className="p-4 border-t border-[#2f2f2f]">
        <p className="text-xs text-[#8e8e8e] text-center">
          Powered by Groq
        </p>
      </div>
    </aside>
  )
}
