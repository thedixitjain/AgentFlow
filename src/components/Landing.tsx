'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, ArrowRight, FileText, BarChart2, Zap, Github } from 'lucide-react'
import { DocumentFile } from '@/lib/types'

interface LandingProps {
  onStart: () => void
  onFileUpload: (file: DocumentFile) => void
}

export function Landing({ onStart, onFileUpload }: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)

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
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <Github className="w-5 h-5" />
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
