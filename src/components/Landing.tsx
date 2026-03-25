'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Menu,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import type { DocumentFile, ChatHistory } from '@/lib/types'
import { WORKSPACE_TEMPLATES, type WorkspaceTemplateId } from '@/lib/demoTemplates'
import type { PersistenceStatus } from '@/lib/api'
import {
  buildParsedTextDocument,
  getUploadErrorMessage,
  toReadableConversationTitle,
  toReadableDocumentName,
  toUserFacingAppError,
} from '@/lib/businessUx'

const GITHUB_PROFILE_URL = 'https://github.com/thedixitjain'
const LINKEDIN_PROFILE_URL = 'https://www.linkedin.com/in/thedixitjain'

interface LandingProps {
  onStart: () => Promise<void>
  onFileUpload: (file: DocumentFile) => Promise<void>
  onUploadError: (message: string) => void
  onLoadTemplate: (templateId: WorkspaceTemplateId) => Promise<void>
  recentChats: ChatHistory[]
  onLoadChat: (chat: ChatHistory) => Promise<void>
  errorMessage: string | null
  onDismissError: () => void
  configWarning: boolean
  persistenceStatus: PersistenceStatus | null
}

// ─── Agent pipeline data ──────────────────────────────────────────────────
const AGENTS = [
  {
    key: 'orchestrator',
    icon: <Zap className="w-4 h-4" />,
    color: '#10a37f',
    name: 'Orchestrator',
    desc: 'Routes each query to the right agent based on intent.',
  },
  {
    key: 'ingest',
    icon: <Database className="w-4 h-4" />,
    color: '#3b82f6',
    name: 'Ingest',
    desc: 'Parses and chunks your document into a searchable index.',
  },
  {
    key: 'question',
    icon: <Bot className="w-4 h-4" />,
    color: '#8b5cf6',
    name: 'Retrieval',
    desc: 'Runs semantic search to find the most relevant passages.',
  },
  {
    key: 'verifier',
    icon: <Search className="w-4 h-4" />,
    color: '#f59e0b',
    name: 'Verifier',
    desc: 'Cross-checks the answer against source chunks for accuracy.',
  },
  {
    key: 'summarizer',
    icon: <FileText className="w-4 h-4" />,
    color: '#ec4899',
    name: 'Summarizer',
    desc: 'Packages findings into a structured, shareable decision brief.',
  },
]

// ─── Step data ────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload any business file',
    body: 'Drop a CSV, Excel sheet, PDF, Word doc, or plain text. Structured or unstructured—both work.',
  },
  {
    step: '02',
    title: 'Ask in plain language',
    body: 'Ask about trends, risks, key metrics, or request a one-page summary for leadership.',
  },
  {
    step: '03',
    title: 'Get decisions, not just answers',
    body: 'Every response is grounded in your document and packaged into a brief you can actually share.',
  },
]

export function Landing({
  onStart,
  onFileUpload,
  onUploadError,
  onLoadTemplate,
  recentChats,
  onLoadChat,
  errorMessage,
  onDismissError,
  configWarning,
  persistenceStatus,
}: LandingProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState<WorkspaceTemplateId | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleOpenWorkspace = useCallback(async () => {
    setIsOpeningWorkspace(true)
    try {
      await onStart()
    } finally {
      setIsOpeningWorkspace(false)
    }
  }, [onStart])

  const handleLoadTemplate = useCallback(async (templateId: WorkspaceTemplateId) => {
    setIsLoadingTemplate(templateId)
    try {
      await onLoadTemplate(templateId)
    } finally {
      setIsLoadingTemplate(null)
    }
  }, [onLoadTemplate])

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const readableFileName = toReadableDocumentName(file.name)

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
                data: data.filter((row) => Object.values(row).some((value) => value)),
                columns: results.meta.fields || [],
                uploadedAt: new Date(),
              }).then(resolve).catch(reject)
            },
            error: (err: Error) => reject(err),
          })
        })
        return
      }

      if (ext === 'xlsx' || ext === 'xls') {
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
        return
      }

      if (ext === 'txt') {
        await onFileUpload({
          name: file.name,
          type: 'txt',
          size: file.size,
          content: await file.text(),
          uploadedAt: new Date(),
        })
        return
      }

      if (ext === 'pdf') {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
        if (!response.ok) {
          onUploadError(
            await getUploadErrorMessage(
              response,
              `We couldn't upload ${readableFileName}. Please try another PDF or export it as text.`,
            ),
          )
          return
        }
        const result = (await response.json()) as { text?: string }
        await onFileUpload(buildParsedTextDocument(file, 'pdf', result.text))
        return
      }

      if (ext === 'docx' || ext === 'docm' || ext === 'doc') {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/parse-docx', { method: 'POST', body: formData })
        if (!response.ok) {
          onUploadError(
            await getUploadErrorMessage(
              response,
              `We couldn't read ${readableFileName}. For Word, use .docx (Save As in Word or Google Docs).`,
            ),
          )
          return
        }
        const result = (await response.json()) as { text?: string }
        await onFileUpload(buildParsedTextDocument(file, 'docx', result.text))
        return
      }

      if (ext === 'pptx' || ext === 'ppt') {
        await onFileUpload({
          name: file.name,
          type: 'pptx',
          size: file.size,
          content: (await file.text().catch(() => '')) || 'PowerPoint uploaded. Text extraction is limited for this format.',
          uploadedAt: new Date(),
        })
        return
      }

      onUploadError('That file type is not supported yet. Please upload CSV, Excel, PDF, Word, PowerPoint, or text.')
    } catch (error) {
      onUploadError(
        toUserFacingAppError(
          error,
          `We couldn't upload ${readableFileName}. Please try again with a different file.`,
        ),
      )
    } finally {
      setIsUploading(false)
    }
  }, [onFileUpload, onUploadError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-word.document.macroEnabled.12': ['.docm'],
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

  const isDisabled = Boolean(isLoadingTemplate) || isOpeningWorkspace || isUploading

  const navItems = [
    { id: 'how-it-works', label: 'How it works' },
    { id: 'agents', label: 'Architecture' },
    { id: 'use-cases', label: 'Templates' },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-100 relative overflow-hidden">
      {/* Background layers */}
      <div className="pointer-events-none fixed inset-0 bg-mesh-hero" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-grid-faint opacity-40" aria-hidden />

      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c0c0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
            aria-label="AgentFlow — scroll to top"
          >
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-[#10a37f]/20">
              <Image src="/logo.png" alt="AgentFlow logo" fill className="object-cover" />
            </div>
            <div>
              <p className="font-display text-base font-semibold tracking-tight">AgentFlow</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 hidden sm:block">Multi-Agent AI</p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToSection('use-cases')}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Browse templates
            </button>
            <button
              type="button"
              onClick={() => void handleOpenWorkspace()}
              disabled={isDisabled}
              className="rounded-lg bg-[#10a37f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d8a6a] disabled:opacity-50"
            >
              {isOpeningWorkspace ? 'Opening…' : 'Open workspace'}
            </button>
          </div>

          <button
            type="button"
            className="lg:hidden rounded-lg p-2 hover:bg-white/[0.05]"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/[0.06] bg-[#0c0c0f] px-4 pb-4">
            <div className="flex flex-col gap-1 pt-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-lg px-3 py-3 text-left text-zinc-300 hover:bg-white/[0.05]"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void handleOpenWorkspace()}
                disabled={isDisabled}
                className="mt-1 rounded-lg bg-[#10a37f] px-3 py-3 text-left text-sm font-medium text-white hover:bg-[#0d8a6a] disabled:opacity-50"
              >
                Open workspace
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Config warning ───────────────────────────────────────────────── */}
      {configWarning && (
        <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/50 px-4 py-3 text-sm text-amber-100/95">
            <p className="font-medium text-amber-50">The AgentFlow API isn't reachable from this environment.</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              Check that the backend is running and that your app is pointed at the correct API URL. You can still browse the interface.
            </p>
          </div>
        </div>
      )}

      {/* ─── Error banner ─────────────────────────────────────────────────── */}
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16 space-y-28">

        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#10a37f]/30 bg-[#10a37f]/10 px-3.5 py-1.5 text-xs font-medium text-[#5eead4]">
              <Sparkles className="w-3 h-3" />
              Multi-Agent Document Intelligence
            </div>

            <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-[3.5rem] font-semibold leading-[1.08] tracking-tight text-white">
              Turn business documents into decisions.
            </h1>

            <p className="mt-5 max-w-lg text-lg text-zinc-400 leading-relaxed">
              Five specialized AI agents handle retrieval, verification, and summarization—so every answer is grounded in your actual data, not hallucinated.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => void handleOpenWorkspace()}
                disabled={isDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10a37f] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0d8a6a] disabled:opacity-60"
              >
                {isOpeningWorkspace ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                Open workspace
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('use-cases')}
                disabled={isDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.06] disabled:opacity-60"
              >
                <ArrowRight className="w-4 h-4 text-[#5eead4]" />
                Browse templates
              </button>
            </div>

            {/* Trust micro-row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              {[
                'No prompt engineering needed',
                'Answers cite your document',
                'Exportable decision briefs',
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10a37f]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Upload zone card ─────────────────────────────────────── */}
          <div className="rounded-[28px] border border-white/[0.09] bg-zinc-950/80 p-5 shadow-2xl shadow-black/50 backdrop-blur">
            <div
              {...getRootProps()}
              className={`rounded-2xl border border-dashed px-5 py-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-[#10a37f] bg-[#10a37f]/10'
                  : 'border-white/[0.12] bg-zinc-900/50 hover:border-[#10a37f]/40 hover:bg-zinc-900/80'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#10a37f]/15 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-[#10a37f]" />
              </div>
              <p className="text-sm font-medium text-zinc-100">
                {isDragActive ? 'Drop to open workspace' : 'Upload a document'}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">CSV, Excel, PDF, DOCX, or plain text</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-zinc-900 px-3 py-1.5 text-xs font-medium shadow-sm">
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {isUploading ? 'Loading workspace…' : 'Drop file or click to upload'}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-zinc-900/40 p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">What you get</p>
              {[
                { icon: <CheckCircle2 className="w-4 h-4 text-[#10a37f]" />, text: 'Plain-language Q&A grounded in your file' },
                { icon: <Workflow className="w-4 h-4 text-[#10a37f]" />, text: 'Exportable decision brief with risks and actions' },
              ].map((row) => (
                <div key={row.text} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{row.icon}</div>
                  <p className="text-sm text-zinc-300">{row.text}</p>
                </div>
              ))}

              {persistenceStatus && (
                <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5 mt-1">
                  <p className="text-xs font-medium text-zinc-300">
                    {persistenceStatus.mode === 'database-ready'
                      ? 'Your workspace syncs to the server.'
                      : 'Workspace saved on this device.'}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
                    {persistenceStatus.mode === 'database-ready'
                      ? 'Open from another device on the same account to continue.'
                      : 'Clearing site data starts a fresh workspace.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────────────────── */}
        <section id="how-it-works">
          <div className="max-w-xl mb-10">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-600">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">
              Upload once, then ask anything your leadership would ask.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} className="relative rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6 group hover:border-white/[0.14] transition-colors">
                <p className="font-display text-4xl font-bold text-zinc-800 group-hover:text-zinc-700 transition-colors">{step}</p>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Agent architecture ───────────────────────────────────────── */}
        <section id="agents">
          <div className="max-w-xl mb-10">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-600">Architecture</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">
              Five agents. One pipeline. Every answer is verified.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Rather than a single model doing everything, AgentFlow routes each query through a chain of specialized agents—each responsible for one job and doing it well.
            </p>
          </div>

          {/* Desktop: horizontal pipeline */}
          <div className="hidden md:grid md:grid-cols-5 gap-0 relative">
            {/* Connector line */}
            <div className="absolute top-[2.25rem] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" aria-hidden />
            {AGENTS.map((agent, i) => (
              <div key={agent.key} className="flex flex-col items-center text-center px-2 relative">
                <div
                  className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ backgroundColor: `${agent.color}1a`, boxShadow: `0 0 0 1px ${agent.color}30` }}
                >
                  <span style={{ color: agent.color }}>{agent.icon}</span>
                  {i < AGENTS.length - 1 && (
                    <div
                      className="absolute -right-[calc(50%+0.375rem)] top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-20"
                      aria-hidden
                    >
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-zinc-100">{agent.name}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{agent.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile: vertical list */}
          <div className="md:hidden space-y-3">
            {AGENTS.map((agent, i) => (
              <div key={agent.key} className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-zinc-900/35 p-4">
                <div
                  className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${agent.color}1a`, boxShadow: `0 0 0 1px ${agent.color}30` }}
                >
                  <span style={{ color: agent.color }}>{agent.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{agent.name}</p>
                    <span className="text-[10px] text-zinc-600 font-medium">0{i + 1}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{agent.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Feature cards ────────────────────────────────────────────── */}
        <section id="product" className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Bot,
              color: '#10a37f',
              title: 'Grounded answers',
              body: 'Every response traces back to a passage in your file. No hallucinations, no generic AI filler.',
            },
            {
              icon: Zap,
              color: '#8b5cf6',
              title: 'Template-driven start',
              body: 'Skip the blank-page problem with pre-loaded sample files for sales, support, and content work.',
            },
            {
              icon: FileText,
              color: '#3b82f6',
              title: 'Shareable decision briefs',
              body: 'Generate a structured summary with highlights, risks, actions, and follow-up questions in one click.',
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6 hover:border-white/[0.14] transition-colors">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </section>

        {/* ─── Use cases / Templates ────────────────────────────────────── */}
        <section id="use-cases">
          <div className="max-w-xl mb-10">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-600">Templates</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">
              Start with real data. Ask a real question.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Every template loads a sample document into your workspace so the first question already feels like a real ops or sales review.
            </p>
          </div>

          <div className="mt-2 grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Sales Analyst',
                body: 'Load structured revenue data and surface KPIs, trends, and next actions for leadership.',
                templateId: 'sales-analyst' as WorkspaceTemplateId,
                color: '#10a37f',
              },
              {
                title: 'Support Copilot',
                body: 'Turn a support brief into priority queues, escalation plans, and grounded response drafts.',
                templateId: 'support-copilot' as WorkspaceTemplateId,
                color: '#3b82f6',
              },
              {
                title: 'Content Writer',
                body: 'Start from a campaign brief and generate launch messaging with a reusable agent workflow.',
                templateId: 'content-writer' as WorkspaceTemplateId,
                color: '#8b5cf6',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6 hover:border-white/[0.14] transition-colors flex flex-col"
              >
                <div
                  className="w-2 h-2 rounded-full mb-5"
                  style={{ backgroundColor: card.color }}
                />
                <h3 className="font-display text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400 flex-1">{card.body}</p>
                <button
                  type="button"
                  onClick={() => void handleLoadTemplate(card.templateId)}
                  disabled={isDisabled && isLoadingTemplate !== card.templateId}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#5eead4] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoadingTemplate === card.templateId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isLoadingTemplate === card.templateId ? 'Loading…' : 'Load this template'}
                </button>
              </div>
            ))}
          </div>

          {/* Full template picker */}
          <div className="mt-8 rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[#10a37f]/10 via-zinc-900/60 to-zinc-950 px-6 py-7 sm:px-8">
            <p className="text-sm font-semibold text-zinc-200">All templates</p>
            <p className="mt-1 text-xs text-zinc-500">Pick one and start exploring right away.</p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {WORKSPACE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => void handleLoadTemplate(template.id)}
                  disabled={isDisabled}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3.5 text-left transition-colors hover:bg-black/35 hover:border-[#10a37f]/30 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{template.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 line-clamp-2">{template.description}</p>
                    </div>
                    {isLoadingTemplate === template.id ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#10a37f]" />
                    ) : (
                      <ArrowRight className="w-4 h-4 shrink-0 text-zinc-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Trust ────────────────────────────────────────────────────── */}
        <section id="trust" className="grid gap-8 lg:grid-cols-[1fr_1fr] items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-600">Privacy &amp; security</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">
              Your documents stay yours.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-sm">
              Workspaces are scoped per account when Google sign-in is enabled. Answers always trace back to the file you uploaded—no data leaves your deployment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/privacy" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
                Privacy policy <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a href="/security" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
                Security details <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              {
                icon: <ShieldCheck className="w-4 h-4" />,
                color: '#10a37f',
                title: 'Scoped access',
                body: 'Google sign-in keeps each account\'s workspace separate.',
              },
              {
                icon: <Workflow className="w-4 h-4" />,
                color: '#3b82f6',
                title: 'Persistent sessions',
                body: 'Your files and chat history survive a page refresh.',
              },
              {
                icon: <CheckCircle2 className="w-4 h-4" />,
                color: '#8b5cf6',
                title: 'Citable answers',
                body: 'Every response shows which passages it drew from.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Recent chats ─────────────────────────────────────────────── */}
        {recentChats.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-600">Continue working</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => void onLoadChat(chat)}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-900/35 p-4 text-left transition-colors hover:border-[#10a37f]/25 hover:bg-zinc-900/60"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {toReadableConversationTitle(chat.title)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{chat.messages.length} messages</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-zinc-200">AgentFlow</p>
            <p className="mt-1 text-xs text-zinc-600 max-w-xs">
              Multi-agent document intelligence — built with LangGraph, RAG pipelines, and Next.js.
            </p>
            <p className="mt-2 text-xs text-zinc-700">
              Built by{' '}
              <a
                href={LINKEDIN_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Dixit Jain
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-zinc-600">
            <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="/security" className="hover:text-zinc-300 transition-colors">Security</a>
            <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
            <a href={LINKEDIN_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
