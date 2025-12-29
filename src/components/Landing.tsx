'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { 
  Upload, ArrowRight, FileText, BarChart3, Zap, 
  FileSpreadsheet, Clock, Sparkles, Shield, Globe
} from 'lucide-react'
import { DocumentFile, ChatHistory } from '@/lib/types'

interface LandingProps {
  onStart: () => void
  onFileUpload: (file: DocumentFile) => void
  recentChats: ChatHistory[]
  onLoadChat: (chat: ChatHistory) => void
}

const SAMPLE_FILES = [
  { name: 'sales_data.csv', label: 'Sales Data', icon: FileSpreadsheet, desc: '500+ transactions' },
  { name: 'customer_data.csv', label: 'Customer Data', icon: FileText, desc: 'Customer analytics' },
  { name: 'sample_research_paper.txt', label: 'Research Paper', icon: FileText, desc: 'Academic document' },
]

export function Landing({ onStart, onFileUpload, recentChats, onLoadChat }: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [loadingSample, setLoadingSample] = useState<string | null>(null)

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase()
    
    try {
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
            setIsUploading(false)
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
        setIsUploading(false)
      } else if (ext === 'txt' || ext === 'md') {
        const text = await file.text()
        onFileUpload({
          name: file.name,
          type: 'txt',
          size: file.size,
          content: text,
          uploadedAt: new Date(),
        })
        setIsUploading(false)
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
        setIsUploading(false)
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
        setIsUploading(false)
      }
    } catch (error) {
      console.error('File processing error:', error)
      setIsUploading(false)
    }
  }, [onFileUpload])

  const loadSampleFile = useCallback(async (filename: string) => {
    setLoadingSample(filename)
    try {
      const response = await fetch(`/sample_data/${filename}`)
      const text = await response.text()
      const ext = filename.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const data = results.data as Record<string, unknown>[]
            onFileUpload({
              name: filename,
              type: 'csv',
              size: text.length,
              data: data.filter(row => Object.values(row).some(v => v)),
              columns: results.meta.fields || [],
              uploadedAt: new Date(),
            })
            setLoadingSample(null)
          },
        })
      } else if (ext === 'txt') {
        onFileUpload({
          name: filename,
          type: 'txt',
          size: text.length,
          content: text,
          uploadedAt: new Date(),
        })
        setLoadingSample(null)
      }
    } catch (error) {
      console.error('Sample file load error:', error)
      setLoadingSample(null)
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
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-auto">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-purple-950/10 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg">AgentFlow</span>
            <span className="text-xs text-zinc-500 block -mt-0.5">AI Document Intelligence</span>
          </div>
        </div>
        <a
          href="https://github.com/thedixitjain/AgentFlow"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all"
        >
          View on GitHub
        </a>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-16 pb-12 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by Llama 3.1 70B
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            Understand any document
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              in seconds
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload CSV, Excel, PDF, or Word files. Ask questions in plain English. 
            Get instant, accurate insights powered by AI.
          </p>

          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div
              {...getRootProps()}
              className={`
                group relative px-8 py-4 rounded-xl font-semibold cursor-pointer transition-all duration-300
                ${isDragActive 
                  ? 'bg-blue-600 scale-105 shadow-xl shadow-blue-500/30' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.02]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-3">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span>{isDragActive ? 'Drop your file here' : 'Upload Document'}</span>
              </div>
            </div>

            <button
              onClick={onStart}
              className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50 transition-all duration-300"
            >
              <span>Start Chatting</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-zinc-600">
            Supports CSV, XLSX, PDF, DOCX, and TXT files
          </p>
        </div>

        {/* Sample Data Section */}
        <div className="mb-16">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-2">Try with sample data</h3>
            <p className="text-sm text-zinc-500">No files? Test AgentFlow with our sample datasets</p>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {SAMPLE_FILES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => loadSampleFile(sample.name)}
                disabled={loadingSample !== null}
                className="group p-4 rounded-xl border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-blue-500/20 transition-colors">
                    {loadingSample === sample.name ? (
                      <div className="w-5 h-5 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <sample.icon className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{sample.label}</p>
                    <p className="text-xs text-zinc-600">{sample.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Document Analysis</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Upload PDFs, Word docs, or text files. Get summaries, extract key information, and find answers instantly.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Data Intelligence</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Analyze CSV and Excel files. Calculate statistics, identify trends, and get data-driven insights automatically.
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Powered by Groq's ultra-fast inference. Get responses in milliseconds, not seconds.
            </p>
          </div>
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-400">Continue where you left off</h3>
            </div>
            <div className="grid gap-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onLoadChat(chat)}
                  className="p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left group"
                >
                  <p className="font-medium truncate group-hover:text-blue-400 transition-colors">{chat.title}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>No data stored on servers</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Sub-second responses</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <span>Built by <a href="https://linkedin.com/in/thedixitjain" className="text-zinc-400 hover:text-white transition-colors">Dixit Jain</a></span>
          <div className="flex gap-6">
            <a href="https://github.com/thedixitjain" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://linkedin.com/in/thedixitjain" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
