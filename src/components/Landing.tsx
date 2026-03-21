'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  Upload,
  ArrowRight,
  FileText,
  BarChart2,
  Zap,
  Database,
  Sparkles,
  Bot,
  CheckCircle,
  Search,
  Menu,
  X,
  Layers,
  Radio,
  Server,
  BookOpen,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react'
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

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL
const ARCHITECTURE_DOC =
  'https://github.com/thedixitjain/AgentFlow/blob/main/docs/ARCHITECTURE.md'
interface LandingProps {
  onStart: () => Promise<void>
  onFileUpload: (file: DocumentFile) => Promise<void>
  recentChats: ChatHistory[]
  onLoadChat: (chat: ChatHistory) => Promise<void>
  errorMessage: string | null
  onDismissError: () => void
  configWarning: boolean
  configuredApiUrl: string
}

export function Landing({
  onStart,
  onFileUpload,
  recentChats,
  onLoadChat,
  errorMessage,
  onDismissError,
  configWarning,
  configuredApiUrl,
}: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingSample, setIsLoadingSample] = useState(false)
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const loadSampleData = useCallback(async () => {
    setIsLoadingSample(true)
    try {
      await new Promise<void>((resolve, reject) => {
        Papa.parse(SAMPLE_SALES_CSV, {
          header: true,
          complete: (results) => {
            const data = results.data as Record<string, unknown>[]
            void onFileUpload({
              name: 'sales_data.csv',
              type: 'csv',
              size: SAMPLE_SALES_CSV.length,
              data: data.filter((row) => Object.values(row).some((v) => v)),
              columns: results.meta.fields || [],
              uploadedAt: new Date(),
            })
              .then(resolve)
              .catch(reject)
          },
          error: (err: Error) => reject(err),
        })
      })
    } finally {
      setIsLoadingSample(false)
    }
  }, [onFileUpload])

  const handleOpenWorkspace = useCallback(async () => {
    setIsOpeningWorkspace(true)
    try {
      await onStart()
    } finally {
      setIsOpeningWorkspace(false)
    }
  }, [onStart])

  const processFile = useCallback(
    async (file: File) => {
      setIsUploading(true)
      const ext = file.name.split('.').pop()?.toLowerCase()

      try {
        if (ext === 'csv') {
          await new Promise<void>((resolve, reject) => {
            Papa.parse(file, {
              header: true,
              complete: (results) => {
                const data = results.data as Record<string, unknown>[]
                void onFileUpload({
                  name: file.name,
                  type: 'csv',
                  size: file.size,
                  data: data.filter((row) => Object.values(row).some((v) => v)),
                  columns: results.meta.fields || [],
                  uploadedAt: new Date(),
                })
                  .then(resolve)
                  .catch(reject)
              },
              error: (err: Error) => reject(err),
            })
          })
        } else if (ext === 'xlsx' || ext === 'xls') {
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
          await onFileUpload({
            name: file.name,
            type: 'xlsx',
            size: file.size,
            data,
            columns: data.length > 0 ? Object.keys(data[0]) : [],
            uploadedAt: new Date(),
          })
        } else if (ext === 'txt') {
          const text = await file.text()
          await onFileUpload({
            name: file.name,
            type: 'txt',
            size: file.size,
            content: text,
            uploadedAt: new Date(),
          })
        } else if (ext === 'pdf') {
          const formData = new FormData()
          formData.append('file', file)

          try {
            const response = await fetch('/api/parse-pdf', {
              method: 'POST',
              body: formData,
            })

            if (response.ok) {
              const result = await response.json()
              await onFileUpload({
                name: file.name,
                type: 'pdf',
                size: file.size,
                content: result.text || 'PDF content could not be extracted. Try uploading as TXT.',
                uploadedAt: new Date(),
              })
            } else {
              await onFileUpload({
                name: file.name,
                type: 'pdf',
                size: file.size,
                content: 'PDF parsing failed. Try uploading as TXT for better results.',
                uploadedAt: new Date(),
              })
            }
          } catch {
            await onFileUpload({
              name: file.name,
              type: 'pdf',
              size: file.size,
              content: 'PDF parsing error. Try uploading as TXT.',
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
              await onFileUpload({
                name: file.name,
                type: 'docx',
                size: file.size,
                content: result.text || 'DOCX content could not be extracted.',
                uploadedAt: new Date(),
              })
            } else {
              await onFileUpload({
                name: file.name,
                type: 'docx',
                size: file.size,
                content: 'DOCX parsing failed.',
                uploadedAt: new Date(),
              })
            }
          } catch {
            await onFileUpload({
              name: file.name,
              type: 'docx',
              size: file.size,
              content: 'DOCX parsing error.',
              uploadedAt: new Date(),
            })
          }
        } else if (ext === 'pptx' || ext === 'ppt') {
          const text = await file.text().catch(() => '')
          await onFileUpload({
            name: file.name,
            type: 'pptx',
            size: file.size,
            content: text || 'PowerPoint uploaded. Text extraction limited.',
            uploadedAt: new Date(),
          })
        }
      } finally {
        setIsUploading(false)
      }
    },
    [onFileUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
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
    multiple: false,
  })

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navItems = [
    { id: 'demo', label: 'Demo' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'agents', label: 'Agents' },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-100 relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh-hero" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-grid-faint opacity-40" aria-hidden />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c0c0f]/80 backdrop-blur-xl">
        <div className="px-4 md:px-8 py-3 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-[#10a37f]/40 blur-lg" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] flex items-center justify-center shadow-lg shadow-[#10a37f]/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <span className="font-display font-semibold text-lg tracking-tight">AgentFlow</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hidden sm:block">
                Document intelligence
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <a
              href="https://github.com/thedixitjain/AgentFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors inline-flex items-center gap-1"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </nav>

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-white/5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="lg:hidden px-4 pb-4 border-t border-white/[0.06] bg-[#0c0c0f]">
            <div className="flex flex-col gap-1 pt-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="text-left py-3 px-2 text-zinc-300 rounded-lg hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="https://github.com/thedixitjain/AgentFlow"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-2 text-zinc-300"
              >
                GitHub
              </a>
            </div>
          </nav>
        )}
      </header>

      {configWarning && (
        <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-950/50 px-4 py-3 text-sm text-amber-100/95">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-50">API URL not set for production</p>
              <p className="text-amber-100/80 text-xs mt-1 leading-relaxed">
                This deployment is still pointing at <code className="text-amber-200/90">localhost</code>.
                In Vercel → Environment Variables, set{' '}
                <code className="text-amber-200/90">NEXT_PUBLIC_API_URL</code> to your Render API (e.g.{' '}
                <code className="text-amber-200/90 break-all">https://your-service.onrender.com/api</code>
                ), then redeploy. On Render, set{' '}
                <code className="text-amber-200/90">CORS_ORIGIN</code> to this site&apos;s URL.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-500/35 bg-red-950/60 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={onDismissError}
              className="p-1 rounded-lg hover:bg-red-900/60 shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16 max-w-6xl mx-auto">
        {/* Hero */}
        <section className="text-center mb-16 md:mb-20 max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-[#10a37f] mb-6 px-4 py-1.5 rounded-full border border-[#10a37f]/25 bg-[#10a37f]/10">
            <Radio className="w-3.5 h-3.5" />
            Multi-agent RAG · Groq · Observable backend
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold mb-6 leading-[1.1] tracking-tight">
            Analyze business documents with{' '}
            <span className="bg-gradient-to-r from-[#5eead4] via-[#10a37f] to-[#34d399] bg-clip-text text-transparent">
              intelligent agents
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Upload sales, finance, or ops files, then ask in plain English. Grounded answers, cited
            retrieval, and a routing layer built for portfolio-grade demos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-3xl mx-auto w-full">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl px-5 py-3.5 font-medium transition-all shadow-lg min-h-[52px] flex items-center justify-center ${
                isDragActive
                  ? 'bg-[#10a37f] text-white ring-2 ring-[#10a37f]/50'
                  : 'bg-white text-zinc-900 hover:bg-zinc-100'
              } ${isUploading || isLoadingSample || isOpeningWorkspace ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-2">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="text-sm sm:text-base">{isDragActive ? 'Drop file' : 'Upload document'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadSampleData()}
              disabled={isLoadingSample || isUploading || isOpeningWorkspace}
              className="rounded-xl px-5 py-3.5 font-medium bg-[#10a37f] hover:bg-[#0d8a6a] text-white transition-colors shadow-lg shadow-[#10a37f]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px]"
            >
              {isLoadingSample ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Database className="w-5 h-5" />
              )}
              <span className="text-sm sm:text-base">Try sample data</span>
            </button>

            <button
              type="button"
              onClick={() => void handleOpenWorkspace()}
              disabled={isOpeningWorkspace || isLoadingSample || isUploading}
              className="rounded-xl px-5 py-3.5 font-medium border-2 border-[#10a37f]/40 bg-[#10a37f]/10 hover:bg-[#10a37f]/20 text-white transition-colors flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOpeningWorkspace ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5 text-[#5eead4]" />
              )}
              <span className="text-sm sm:text-base font-semibold">Open workspace</span>
            </button>
          </div>

          <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed">
            API base:{' '}
            <span className="text-zinc-400 font-mono text-[10px] break-all">{configuredApiUrl}</span>
            . Production: use <span className="text-zinc-400">NEXT_PUBLIC_API_URL=/agentflow-api</span> on
            Vercel (proxied to Render to avoid CORS). See repo README.
          </p>
        </section>

        {/* Plain-English product flow */}
        <section className="mb-20 md:mb-28" aria-labelledby="flow-heading">
          <h2
            id="flow-heading"
            className="font-display text-xl sm:text-2xl font-semibold text-white text-center mb-2"
          >
            What you’re looking at
          </h2>
          <p className="text-sm text-zinc-500 text-center mb-10 max-w-2xl mx-auto leading-relaxed">
            Three steps that map to the architecture: ingest → retrieve → answer. No jargon required
            to try the demo; the labels in the app mirror how the backend works.
          </p>
          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            {[
              {
                title: '1 · Bring your file',
                body: 'Upload or use sample data. The API parses and stores the document against your session.',
              },
              {
                title: '2 · Ask a real question',
                body: 'Plain English. The orchestrator may route to RAG (search your chunks), Q&A, summary, or verify.',
              },
              {
                title: '3 · Read the answer',
                body: 'Streaming replies. When retrieval runs, expand “sources” to see which text chunks were used.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-zinc-900/35 p-6 text-left h-full flex flex-col"
              >
                <h3 className="font-display text-sm font-semibold text-[#10a37f] mb-3">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed flex-1">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product preview (visitors): optional narrated video replaces GIF when configured in deploy */}
        <section id="demo" className="mb-24 md:mb-32 scroll-mt-28">
          <div className="text-center max-w-2xl mx-auto mb-10 px-2">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-3">
              See it in action
            </h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              {DEMO_VIDEO_URL ? (
                <>Short walkthrough of the product.</>
              ) : (
                <>
                  Preview of the workspace below: upload, chat, and answers grounded in your
                  documents. Use <span className="text-zinc-300">Open workspace</span> above to try it
                  live.
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 overflow-hidden shadow-2xl shadow-black/40">
            {DEMO_VIDEO_URL ? (
              <div className="aspect-video w-full">
                <iframe
                  title="AgentFlow demo video"
                  src={DEMO_VIDEO_URL}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="grid lg:grid-cols-5">
                <div className="lg:col-span-3 relative min-h-[220px] sm:min-h-[280px] md:aspect-video lg:aspect-auto lg:min-h-[340px] border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-black/30">
                  <Image
                    src="/media/demo.gif"
                    alt="Screen recording: AgentFlow chat workspace with document and messages"
                    fill
                    className="object-cover object-top"
                    unoptimized
                    priority
                  />
                </div>
                <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 flex flex-col justify-center text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#10a37f] mb-2">
                    What this preview shows
                  </p>
                  <h3 className="font-display text-lg sm:text-xl font-semibold text-white mb-4">
                    The same flow you get in the live app
                  </h3>
                  <ul className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                    <li className="flex gap-3">
                      <span className="text-[#10a37f] font-mono text-xs mt-0.5">01</span>
                      <span>Work with business files (CSV, Excel, PDF, text).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#10a37f] font-mono text-xs mt-0.5">02</span>
                      <span>Ask questions in natural language; the backend retrieves relevant chunks, then replies.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#10a37f] font-mono text-xs mt-0.5">03</span>
                      <span>Replies can include source passages so you see what the model used.</span>
                    </li>
                  </ul>
                  <p className="text-xs text-zinc-600 mt-6 leading-relaxed border-t border-white/[0.06] pt-5">
                    Shipped on purpose: a silent preview of the real UI. Replacing it with a narrated
                    video is optional; steps are in the project repository for you when you want them.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="mb-24 md:mb-32 scroll-mt-28">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-3 text-center">
            Production-style architecture
          </h2>
          <p className="text-zinc-400 text-center max-w-2xl mx-auto mb-10">
            Next.js frontend, Express orchestration, embeddings + vector search, file-backed
            persistence, telemetry and eval hooks, documented for interviews and code review.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Layers className="w-5 h-5" />,
                title: 'Orchestration',
                body: 'Routes queries to ingest, RAG, Q&A, verifier, or summarizer agents.',
              },
              {
                icon: <Server className="w-5 h-5" />,
                title: 'API layer',
                body: 'REST + SSE streaming; workspace headers for scoped sessions.',
              },
              {
                icon: <Search className="w-5 h-5" />,
                title: 'Retrieval',
                body: 'Chunking, embeddings, cosine similarity; swap for pgvector later.',
              },
              {
                icon: <Database className="w-5 h-5" />,
                title: 'Persistence',
                body: 'JSON-backed sessions and vectors; configurable DATA_DIR for hosts.',
              },
              {
                icon: <BarChart2 className="w-5 h-5" />,
                title: 'Observability',
                body: 'Telemetry routes, Prometheus metrics, eval run history.',
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'Docs',
                body: 'Full diagrams and flows in the architecture guide.',
                link: ARCHITECTURE_DOC,
              },
            ].map((card) => {
              const inner = (
                <>
                  <div className="w-10 h-10 rounded-lg bg-[#10a37f]/15 text-[#10a37f] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                  <h3 className="font-display font-semibold text-white mb-2 flex items-center gap-2">
                    {card.title}
                    {card.link && (
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60" />
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{card.body}</p>
                </>
              )
              const shell =
                'group rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 hover:border-[#10a37f]/30 hover:bg-zinc-900/50 transition-all block'
              return card.link ? (
                <a
                  key={card.title}
                  href={card.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={shell}
                >
                  {inner}
                </a>
              ) : (
                <div key={card.title} className={shell}>
                  {inner}
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <a
              href={ARCHITECTURE_DOC}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              Read full architecture (Mermaid diagrams)
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mb-20 md:mb-28 scroll-mt-28">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-10 text-center">
            Built for real workflows
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/20 p-8 hover:border-white/[0.12] transition-colors">
              <FileText className="w-9 h-9 mb-5 text-[#10a37f]" />
              <h3 className="font-display font-semibold text-lg text-white mb-2">Document analysis</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Revenue sheets, briefs, and ops updates: summaries, metrics, and grounded Q&A.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/20 p-8 hover:border-white/[0.12] transition-colors">
              <BarChart2 className="w-9 h-9 mb-5 text-[#10a37f]" />
              <h3 className="font-display font-semibold text-lg text-white mb-2">RAG retrieval</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Semantic search surfaces the right evidence; responses can cite sources and scores.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/20 p-8 hover:border-white/[0.12] transition-colors">
              <Zap className="w-9 h-9 mb-5 text-[#10a37f]" />
              <h3 className="font-display font-semibold text-lg text-white mb-2">Multi-agent</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Specialized agents for analysis, verification, and summarization, routed for you.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mb-20 md:mb-28 scroll-mt-28">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-4 text-center">
            How it works
          </h2>
          <p className="text-zinc-400 text-center max-w-lg mx-auto mb-12">
            End-to-end path from upload to grounded answer; same mental model you’d use in a system
            design interview.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Upload', desc: 'CSV, Excel, PDF, or text' },
              { step: '2', title: 'Index', desc: 'Chunk + embed for semantic search' },
              { step: '3', title: 'Route', desc: 'Orchestrator picks the best agent' },
              { step: '4', title: 'Answer', desc: 'Streamed response + optional sources' },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-6 text-left"
              >
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-[#10a37f]/50 to-transparent z-10" />
                )}
                <div className="w-9 h-9 rounded-lg bg-[#10a37f] text-white font-bold flex items-center justify-center mb-4 text-sm">
                  {item.step}
                </div>
                <h4 className="font-display font-medium text-white mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agents */}
        <section id="agents" className="mb-16 md:mb-24 scroll-mt-28">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-4 text-center">
            Agent roster
          </h2>
          <p className="text-zinc-400 text-center max-w-lg mx-auto mb-10">
            Each role is explicit in the UI and in routing, easy to extend with new tools or policies.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, color: 'text-blue-400', name: 'RAG', desc: 'Retrieval-augmented answers' },
              { icon: Bot, color: 'text-violet-400', name: 'Question', desc: 'Direct Q&A with context' },
              { icon: CheckCircle, color: 'text-amber-400', name: 'Verifier', desc: 'Claims and consistency' },
              { icon: FileText, color: 'text-pink-400', name: 'Summarizer', desc: 'Briefs and key points' },
            ].map(({ icon: Icon, color, name, desc }) => (
              <div
                key={name}
                className="rounded-2xl border border-white/[0.08] bg-zinc-900/20 p-5 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="font-display font-medium text-white">{name}</span>
                </div>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {recentChats.length > 0 && (
          <section className="mb-12">
            <h3 className="text-xs text-zinc-500 mb-4 uppercase tracking-[0.2em] text-center">
              Continue where you left off
            </h3>
            <div className="grid gap-3 max-w-lg mx-auto">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => void onLoadChat(chat)}
                  className="rounded-xl p-4 text-left border border-white/[0.08] bg-zinc-900/40 hover:border-[#10a37f]/40 hover:bg-zinc-900/60 transition-all"
                >
                  <p className="text-sm font-medium truncate text-white">{chat.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {chat.messages.length} messages · {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-4 md:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
          <span>Built by Dixit Jain · AgentFlow</span>
          <div className="flex flex-wrap justify-center gap-8">
            <a href="https://github.com/thedixitjain" className="hover:text-white transition-colors">
              GitHub
            </a>
            <a href="https://linkedin.com/in/thedixitjain" className="hover:text-white transition-colors">
              LinkedIn
            </a>
            <a href={ARCHITECTURE_DOC} className="hover:text-white transition-colors">
              Architecture
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
