'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Plus, FileText, FileSpreadsheet, X, Upload, Home, Zap } from 'lucide-react'
import { DocumentFile } from '@/lib/types'
import { cn, formatFileSize } from '@/lib/utils'

interface SidebarProps {
  documents: DocumentFile[]
  activeDocument: string | null
  onFileUpload: (file: DocumentFile) => void
  onSelectDocument: (name: string) => void
  onRemoveDocument: (name: string) => void
  onNewChat: () => void
  onBackToHome: () => void
}

export function Sidebar({
  documents,
  activeDocument,
  onFileUpload,
  onSelectDocument,
  onRemoveDocument,
  onNewChat,
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
    <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold text-sm">AgentFlow</span>
        </div>
        <button
          onClick={onBackToHome}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          title="Back to home"
        >
          <Home className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Upload */}
      <div className="px-3 pb-3">
        <div
          {...getRootProps()}
          className={cn(
            'border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
            isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 hover:border-zinc-700'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-5 h-5 mx-auto mb-2 text-zinc-500" />
          <p className="text-xs text-zinc-500">{isDragActive ? 'Drop here' : 'Upload files'}</p>
        </div>
      </div>

      {/* Documents */}
      <div className="flex-1 overflow-y-auto px-3">
        <p className="text-xs text-zinc-600 mb-2 px-1">Documents</p>
        {documents.length === 0 ? (
          <p className="text-xs text-zinc-700 text-center py-4">No documents</p>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.name}
                onClick={() => onSelectDocument(doc.name)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                  activeDocument === doc.name ? 'bg-zinc-800' : 'hover:bg-zinc-900'
                )}
              >
                {doc.type === 'csv' || doc.type === 'xlsx' ? (
                  <FileSpreadsheet className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-zinc-600">
                    {formatFileSize(doc.size)}
                    {doc.data && ` · ${doc.data.length} rows`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveDocument(doc.name)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 transition-all"
                >
                  <X className="w-3 h-3 text-zinc-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900">
        <p className="text-xs text-zinc-700 text-center">Powered by Groq</p>
      </div>
    </aside>
  )
}
