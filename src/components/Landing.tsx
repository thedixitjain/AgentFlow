'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, ArrowRight, FileText, BarChart2, Zap, Database, Sparkles, Bot, CheckCircle, Search, Menu, X } from 'lucide-react'
import { DocumentFile, ChatHistory } from '@/lib/types'

const SAMPLE_SALES_CSV = `Date,Product,Category,Sales,Revenue,Customer_ID,Region,Quantity
2023-01-15,Laptop Pro,Electronics,1,1200,C001,North,1
2023-01-16,Wireless Mouse,Electronics,3,75,C002,South,3
2023-01-17,Office Chair,Furniture,2,400,C003,East,2
2023-01-18,Laptop Pro,Electronics,1,1200,C004,West,1
2023-01-19,Desk Lamp,Furniture,1,80,C005,North,1
2023-01-20,Wireless Keyboard,Electronics,2,120,C006,South,2
2023-01-21,Standing Desk,Furniture,1,600,C007,East,1
2023-01-22,Laptop Pro,Electronics,2,2400,C008,West,2
2023-01-23,Monitor,Electronics,1,300,C009,North,1
2023-01-24,Office Chair,Furniture,3,1200,C010,South,3
2023-02-01,Laptop Pro,Electronics,1,1200,C011,East,1
2023-02-02,Wireless Mouse,Electronics,5,125,C012,West,5
2023-02-03,Desk Lamp,Furniture,2,160,C013,North,2
2023-02-04,Standing Desk,Furniture,1,600,C014,South,1
2023-02-05,Monitor,Electronics,2,600,C015,East,2
2023-02-06,Wireless Keyboard,Electronics,3,180,C016,West,3
2023-02-07,Office Chair,Furniture,1,400,C017,North,1
2023-02-08,Laptop Pro,Electronics,3,3600,C018,South,3
2023-02-09,Desk Lamp,Furniture,1,80,C019,East,1
2023-02-10,Monitor,Electronics,1,300,C020,West,1`

interface LandingProps {
  onStart: () => void
  onFileUpload: (file: DocumentFile) => void
  recentChats: ChatHistory[]
  onLoadChat: (chat: ChatHistory) => void
}

export function Landing({ onStart, onFileUpload, recentChats, onLoadChat }: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingSample, setIsLoadingSample] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadSampleData = useCallback(() => {
    setIsLoadingSample(true)
    
    Papa.parse(SAMPLE_SALES_CSV, {
      header: true,
      complete: (results) => {
        const data = results.data as Record<string, unknown>[]
        onFileUpload({
          name: 'sales_data.csv',
          type: 'csv',
          size: SAMPLE_SALES_CSV.length,
          data: data.filter(row => Object.values(row).some(v => v)),
          columns: results.meta.fields || [],
          uploadedAt: new Date(),
        })
        setIsLoadingSample(false)
      },
    })
  }, [onFileUpload])

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
    } finally {
      setIsUploading(false)
    }
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  })

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#212121]/95 backdrop-blur border-b border-[#2f2f2f]">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#10a37f] flex items-center justify-center">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="font-semibold text-base md:text-lg">AgentFlow</span>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-[#b4b4b4] hover:text-[#ececec] transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-[#b4b4b4] hover:text-[#ececec] transition-colors">
              How it Works
            </button>
            <button onClick={() => scrollToSection('agents')} className="text-sm text-[#b4b4b4] hover:text-[#ececec] transition-colors">
              Agents
            </button>
            <a
              href="https://github.com/thedixitjain/AgentFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#b4b4b4] hover:text-[#ececec] transition-colors"
            >
              GitHub
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden px-4 py-4 border-t border-[#2f2f2f] bg-[#212121]">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollToSection('features')} className="text-left py-2 text-[#b4b4b4]">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2 text-[#b4b4b4]">How it Works</button>
              <button onClick={() => scrollToSection('agents')} className="text-left py-2 text-[#b4b4b4]">Agents</button>
              <a href="https://github.com/thedixitjain/AgentFlow" target="_blank" rel="noopener noreferrer" className="py-2 text-[#b4b4b4]">GitHub</a>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <main className="px-4 md:px-6 pt-12 md:pt-20 pb-12 md:pb-16 max-w-4xl mx-auto text-center">
        <p className="text-[#10a37f] text-xs md:text-sm font-medium mb-3 md:mb-4 uppercase tracking-wide">
          Multi-Agent AI System with RAG
        </p>
        
        <h1 className="text-3xl md:text-5xl font-semibold mb-4 md:mb-6 leading-tight">
          Analyze documents with
          <br className="hidden md:block" />
          <span className="md:hidden"> </span>intelligent agents
        </h1>
        
        <p className="text-[#b4b4b4] text-base md:text-lg mb-8 md:mb-12 max-w-xl mx-auto leading-relaxed">
          Upload CSV, Excel, PDF, or text files. Ask questions in plain English. 
          Get instant insights powered by specialized AI agents.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-12 md:mb-16">
          <div
            {...getRootProps()}
            className={`w-full sm:w-auto px-6 py-3 font-medium cursor-pointer transition-all ${
              isDragActive 
                ? 'bg-[#10a37f] text-white' 
                : 'bg-[#ececec] text-[#212121] hover:bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2">
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-[#212121]/30 border-t-[#212121] animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>{isDragActive ? 'Drop here' : 'Upload Document'}</span>
            </div>
          </div>

          <button
            onClick={loadSampleData}
            disabled={isLoadingSample}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-medium bg-[#10a37f] hover:bg-[#0d8a6a] text-white transition-colors disabled:opacity-50"
          >
            {isLoadingSample ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Database className="w-5 h-5" />
            )}
            <span>Try Sample Data</span>
          </button>

          <button
            onClick={onStart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-medium border border-[#424242] hover:border-[#8e8e8e] hover:bg-[#2f2f2f] transition-colors"
          >
            <span>Start Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-4 md:gap-6 text-left mb-16 md:mb-20">
          <div className="p-5 md:p-6 bg-[#2f2f2f] border border-[#424242]">
            <FileText className="w-7 h-7 md:w-8 md:h-8 mb-3 md:mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">Document Analysis</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Upload any document and ask questions. Get summaries, find specific info, extract insights.
            </p>
          </div>
          
          <div className="p-5 md:p-6 bg-[#2f2f2f] border border-[#424242]">
            <BarChart2 className="w-7 h-7 md:w-8 md:h-8 mb-3 md:mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">RAG-Powered Search</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Semantic search finds relevant information. Answers cite sources with relevance scores.
            </p>
          </div>
          
          <div className="p-5 md:p-6 bg-[#2f2f2f] border border-[#424242]">
            <Zap className="w-7 h-7 md:w-8 md:h-8 mb-3 md:mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">Multi-Agent System</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Specialized agents handle different tasks. Orchestrator routes queries for optimal results.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div id="how-it-works" className="mb-16 md:mb-20">
          <h2 className="text-xl md:text-2xl font-semibold mb-3 text-[#ececec]">How it Works</h2>
          <p className="text-[#b4b4b4] mb-8 max-w-lg mx-auto">
            AgentFlow uses a multi-agent architecture with RAG (Retrieval-Augmented Generation) for accurate, source-cited answers.
          </p>
          
          <div className="grid md:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-[#2f2f2f] border border-[#424242] relative">
              <div className="w-8 h-8 bg-[#10a37f] flex items-center justify-center text-white font-bold mb-3">1</div>
              <h4 className="font-medium mb-1 text-[#ececec]">Upload</h4>
              <p className="text-xs text-[#b4b4b4]">Upload CSV, Excel, PDF, or text files</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="w-8 h-8 bg-[#10a37f] flex items-center justify-center text-white font-bold mb-3">2</div>
              <h4 className="font-medium mb-1 text-[#ececec]">Index</h4>
              <p className="text-xs text-[#b4b4b4]">Document is chunked and embedded for semantic search</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="w-8 h-8 bg-[#10a37f] flex items-center justify-center text-white font-bold mb-3">3</div>
              <h4 className="font-medium mb-1 text-[#ececec]">Query</h4>
              <p className="text-xs text-[#b4b4b4]">Your question is routed to the best agent</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="w-8 h-8 bg-[#10a37f] flex items-center justify-center text-white font-bold mb-3">4</div>
              <h4 className="font-medium mb-1 text-[#ececec]">Answer</h4>
              <p className="text-xs text-[#b4b4b4]">Get accurate answers with cited sources</p>
            </div>
          </div>
        </div>

        {/* Agents */}
        <div id="agents" className="mb-16 md:mb-20">
          <h2 className="text-xl md:text-2xl font-semibold mb-3 text-[#ececec]">Specialized Agents</h2>
          <p className="text-[#b4b4b4] mb-8 max-w-lg mx-auto">
            Each agent is optimized for specific tasks. The orchestrator automatically routes your query.
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-[#3b82f6]" />
                <span className="font-medium text-[#ececec]">RAG Agent</span>
              </div>
              <p className="text-xs text-[#b4b4b4]">Semantic search and retrieval-augmented answers</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-[#8b5cf6]" />
                <span className="font-medium text-[#ececec]">Question Agent</span>
              </div>
              <p className="text-xs text-[#b4b4b4]">Direct Q&A with context understanding</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-[#f59e0b]" />
                <span className="font-medium text-[#ececec]">Verifier Agent</span>
              </div>
              <p className="text-xs text-[#b4b4b4]">Fact-checking and claim verification</p>
            </div>
            
            <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-[#ec4899]" />
                <span className="font-medium text-[#ececec]">Summarizer Agent</span>
              </div>
              <p className="text-xs text-[#b4b4b4]">Concise summaries and key points extraction</p>
            </div>
          </div>
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div className="mb-12">
            <h3 className="text-sm text-[#8e8e8e] mb-4 uppercase tracking-wide">Continue where you left off</h3>
            <div className="grid gap-3 max-w-lg mx-auto">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onLoadChat(chat)}
                  className="p-4 bg-[#2f2f2f] border border-[#424242] hover:border-[#8e8e8e] hover:bg-[#3a3a3a] transition-all text-left"
                >
                  <p className="text-sm font-medium truncate text-[#ececec]">{chat.title}</p>
                  <p className="text-xs text-[#8e8e8e] mt-1">
                    {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-6 py-6 md:py-8 border-t border-[#2f2f2f]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#8e8e8e]">
          <span>Built by Dixit Jain</span>
          <div className="flex gap-6">
            <a href="https://github.com/thedixitjain" className="hover:text-[#ececec] transition-colors">GitHub</a>
            <a href="https://linkedin.com/in/thedixitjain" className="hover:text-[#ececec] transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
