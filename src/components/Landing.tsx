'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, ArrowRight, FileText, BarChart2, Zap, Database } from 'lucide-react'
import { DocumentFile, ChatHistory } from '@/lib/types'

// Sample sales data embedded for demo
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold">AgentFlow</span>
        </div>
        <a
          href="https://github.com/thedixitjain/AgentFlow"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-white transition-colors text-sm"
        >
          GitHub
        </a>
      </header>

      {/* Hero */}
      <main className="px-6 pt-24 pb-20 max-w-4xl mx-auto text-center">
        <p className="text-zinc-500 text-sm mb-4">AI-Powered Document Intelligence</p>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Understand your documents
          <br />
          <span className="text-zinc-500">in seconds</span>
        </h1>
        
        <p className="text-zinc-400 text-lg mb-12 max-w-xl mx-auto">
          Upload CSV, Excel, PDF, or text files. Ask questions in plain English. 
          Get instant insights powered by AI.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <div
            {...getRootProps()}
            className={`
              px-8 py-4 rounded-xl font-medium cursor-pointer transition-all
              ${isDragActive 
                ? 'bg-blue-600 scale-105' 
                : 'bg-white text-black hover:bg-zinc-200'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex items-center gap-2">
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span>{isDragActive ? 'Drop here' : 'Upload Document'}</span>
            </div>
          </div>

          <button
            onClick={loadSampleData}
            disabled={isLoadingSample}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isLoadingSample ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Database className="w-5 h-5" />
            )}
            <span>Try Sample Data</span>
          </button>

          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-medium border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <span>Start Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-xl border border-zinc-800">
            <FileText className="w-8 h-8 mb-4 text-zinc-400" />
            <h3 className="font-semibold mb-2">Document Analysis</h3>
            <p className="text-sm text-zinc-500">
              Upload any document and ask questions. Get summaries, find specific info, extract insights.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-zinc-800">
            <BarChart2 className="w-8 h-8 mb-4 text-zinc-400" />
            <h3 className="font-semibold mb-2">Data Intelligence</h3>
            <p className="text-sm text-zinc-500">
              Analyze CSV and Excel files. Calculate totals, find trends, identify patterns automatically.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-zinc-800">
            <Zap className="w-8 h-8 mb-4 text-zinc-400" />
            <h3 className="font-semibold mb-2">Instant Responses</h3>
            <p className="text-sm text-zinc-500">
              Powered by Llama 3.1 70B via Groq. Get answers in under a second.
            </p>
          </div>
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm text-zinc-500 mb-4">Continue where you left off</h3>
            <div className="grid gap-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onLoadChat(chat)}
                  className="p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left"
                >
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-zinc-600">
          <span>Built by Dixit Jain</span>
          <div className="flex gap-4">
            <a href="https://github.com/thedixitjain" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://linkedin.com/in/thedixitjain" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
