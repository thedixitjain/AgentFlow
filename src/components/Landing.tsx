'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, ArrowRight, FileText, BarChart2, Zap, Database, Sparkles } from 'lucide-react'
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
2023-02-10,Monitor,Electronics,1,300,C020,West,1
2023-03-01,Laptop Pro,Electronics,2,2400,C021,North,2
2023-03-02,Standing Desk,Furniture,2,1200,C022,South,2
2023-03-03,Wireless Mouse,Electronics,4,100,C023,East,4
2023-03-04,Office Chair,Furniture,1,400,C024,West,1
2023-03-05,Monitor,Electronics,3,900,C025,North,3
2023-03-06,Wireless Keyboard,Electronics,2,120,C026,South,2
2023-03-07,Desk Lamp,Furniture,3,240,C027,East,3
2023-03-08,Laptop Pro,Electronics,1,1200,C028,West,1
2023-03-09,Standing Desk,Furniture,1,600,C029,North,1
2023-03-10,Wireless Mouse,Electronics,2,50,C030,South,2
2023-04-01,Monitor,Electronics,2,600,C031,East,2
2023-04-02,Office Chair,Furniture,2,800,C032,West,2
2023-04-03,Laptop Pro,Electronics,4,4800,C033,North,4
2023-04-04,Desk Lamp,Furniture,1,80,C034,South,1
2023-04-05,Wireless Keyboard,Electronics,3,180,C035,East,3
2023-04-06,Standing Desk,Furniture,1,600,C036,West,1
2023-04-07,Wireless Mouse,Electronics,6,150,C037,North,6
2023-04-08,Monitor,Electronics,1,300,C038,South,1
2023-04-09,Office Chair,Furniture,2,800,C039,East,2
2023-04-10,Laptop Pro,Electronics,2,2400,C040,West,2`

interface LandingProps {
  onStart: () => void
  onFileUpload: (file: DocumentFile) => void
  recentChats: ChatHistory[]
  onLoadChat: (chat: ChatHistory) => void
}

export function Landing({ onStart, onFileUpload, recentChats, onLoadChat }: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingSample, setIsLoadingSample] = useState(false)

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

  return (
    <div className="min-h-screen bg-[#212121] text-[#ececec]">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#10a37f] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">AgentFlow</span>
        </div>
        <a
          href="https://github.com/thedixitjain/AgentFlow"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#b4b4b4] hover:text-[#ececec] transition-colors text-sm"
        >
          GitHub
        </a>
      </header>

      {/* Hero */}
      <main className="px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
        <p className="text-[#10a37f] text-sm font-medium mb-4 uppercase tracking-wide">
          AI-Powered Document Intelligence
        </p>
        
        <h1 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight">
          Analyze documents with
          <br />
          natural language
        </h1>
        
        <p className="text-[#b4b4b4] text-lg mb-12 max-w-xl mx-auto leading-relaxed">
          Upload CSV, Excel, PDF, or text files. Ask questions in plain English. 
          Get instant insights powered by AI.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <div
            {...getRootProps()}
            className={`px-6 py-3 font-medium cursor-pointer transition-all ${
              isDragActive 
                ? 'bg-[#10a37f] text-white' 
                : 'bg-[#ececec] text-[#212121] hover:bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center gap-2">
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
            className="flex items-center gap-2 px-6 py-3 font-medium bg-[#10a37f] hover:bg-[#0d8a6a] text-white transition-colors disabled:opacity-50"
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
            className="flex items-center gap-2 px-6 py-3 font-medium border border-[#424242] hover:border-[#8e8e8e] hover:bg-[#2f2f2f] transition-colors"
          >
            <span>Start Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 text-left mb-16">
          <div className="p-6 bg-[#2f2f2f] border border-[#424242]">
            <FileText className="w-8 h-8 mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">Document Analysis</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Upload any document and ask questions. Get summaries, find specific info, extract insights.
            </p>
          </div>
          
          <div className="p-6 bg-[#2f2f2f] border border-[#424242]">
            <BarChart2 className="w-8 h-8 mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">Data Intelligence</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Analyze CSV and Excel files. Calculate totals, find trends, identify patterns automatically.
            </p>
          </div>
          
          <div className="p-6 bg-[#2f2f2f] border border-[#424242]">
            <Zap className="w-8 h-8 mb-4 text-[#10a37f]" />
            <h3 className="font-semibold mb-2 text-[#ececec]">Instant Responses</h3>
            <p className="text-sm text-[#b4b4b4] leading-relaxed">
              Powered by Llama 3.3 70B via Groq. Get answers in under a second.
            </p>
          </div>
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div>
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
      <footer className="px-6 py-8 border-t border-[#2f2f2f]">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-[#8e8e8e]">
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
