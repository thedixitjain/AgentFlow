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
  FileText,
  Loader2,
  Menu,
  PlayCircle,
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

      if (ext === 'docx' || ext === 'doc') {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/parse-docx', { method: 'POST', body: formData })
        if (!response.ok) {
          onUploadError(
            await getUploadErrorMessage(
              response,
              `We couldn't upload ${readableFileName}. Please try another Word file or export it as text.`,
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
    { id: 'product', label: 'Product' },
    { id: 'use-cases', label: 'Use cases' },
    { id: 'trust', label: 'Trust' },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-100 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-mesh-hero" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-grid-faint opacity-40" aria-hidden />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c0c0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
            aria-label="AgentFlow, scroll to top"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#10a37f]/20">
              <Image src="/logo.png" alt="AgentFlow logo" fill className="object-cover" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">AgentFlow</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 hidden sm:block">AI workspace</p>
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

          <div className="hidden md:flex items-center">
            <button
              type="button"
              onClick={() => void handleOpenWorkspace()}
              disabled={Boolean(isLoadingTemplate) || isOpeningWorkspace || isUploading}
              className="rounded-lg bg-[#10a37f] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d8a6a] disabled:opacity-50"
            >
              Open workspace
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
                disabled={Boolean(isLoadingTemplate) || isOpeningWorkspace || isUploading}
                className="rounded-lg px-3 py-3 text-left text-zinc-100 hover:bg-white/[0.05] disabled:opacity-50"
              >
                Open workspace
              </button>
            </div>
          </div>
        )}
      </header>

      {configWarning && (
        <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/50 px-4 py-3 text-sm text-amber-100/95">
            <p className="font-medium text-amber-50">We can’t reach the AgentFlow API from this environment.</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
              Check that the backend is running and that your app is pointed at the correct API URL. You can still browse the interface.
            </p>
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16 pb-16 space-y-24">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#10a37f]/25 bg-[#10a37f]/10 px-4 py-1.5 text-xs font-medium text-[#5eead4]">
              <Sparkles className="w-3.5 h-3.5" />
              Business Review Copilot
            </div>
            <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
              Turn weekly business reports into action plans.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-400 leading-relaxed">
              Upload sales, support, or operations updates and get a leadership-ready summary, risks, and recommended actions in minutes.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => void handleOpenWorkspace()}
                disabled={Boolean(isLoadingTemplate) || isOpeningWorkspace || isUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10a37f] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0d8a6a] disabled:opacity-60"
              >
                {isOpeningWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                Start for Free
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('demo')}
                disabled={isOpeningWorkspace || Boolean(isLoadingTemplate) || isUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.06] disabled:opacity-60"
              >
                <ArrowRight className="w-4 h-4 text-[#5eead4]" />
                Book a Demo
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { title: 'Leadership summaries', body: 'Generate decision-ready updates from the reports your team already creates every week.' },
                { title: 'Faster iteration', body: 'Start from templates, upload a document, and get to value in minutes.' },
                { title: 'Actionable outputs', body: 'Move from raw files and chat answers to risks, actions, and follow-up questions.' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-zinc-900/35 p-4">
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-zinc-950/70 p-5 shadow-2xl shadow-black/40">
            <div
              {...getRootProps()}
              className={`rounded-2xl border border-dashed px-5 py-6 text-center transition-all ${
                isDragActive ? 'border-[#10a37f] bg-[#10a37f]/10' : 'border-white/[0.12] bg-zinc-900/60 hover:border-[#10a37f]/35'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto w-6 h-6 text-[#10a37f]" />
              <p className="mt-3 text-sm font-medium text-zinc-100">{isDragActive ? 'Drop a file to open the workspace' : 'Upload a business file to get started'}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">CSV, Excel, PDF, DOCX, or text files work out of the box.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-zinc-900 px-3 py-1.5 text-xs font-medium">
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {isUploading ? 'Loading workspace…' : 'Drop file or click to upload'}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">What teams get</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#10a37f] mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">Plain-language Q&amp;A on your files: summaries, risks, and next steps without a manual.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Workflow className="w-4 h-4 text-[#10a37f] mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">Pick up where you left off: recent sessions and documents load when you return.</p>
                </div>
                {persistenceStatus && (
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3">
                    <p className="text-xs font-medium text-zinc-100">
                      {persistenceStatus.mode === 'database-ready'
                        ? 'Your workspace syncs to the server.'
                        : 'Your workspace is saved on this device'}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {persistenceStatus.mode === 'database-ready'
                        ? 'Open AgentFlow from another browser or device signed into the same account to continue.'
                        : 'Clearing site data or using another device starts a fresh workspace until cloud sync is enabled.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Bot,
              title: 'Decision-ready chat',
              body: 'Teams ask questions in plain language and get business-ready answers instead of generic AI chatter.',
            },
            {
              icon: Zap,
              title: 'Template-driven onboarding',
              body: 'Move new users past the blank screen with ready-made starting points for sales, support, and content work.',
            },
            {
              icon: FileText,
              title: 'Clear business outputs',
              body: 'Summaries, risks, actions, and follow-up questions are packaged in a format leaders can use quickly.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6">
              <div className="w-11 h-11 rounded-2xl bg-[#10a37f]/12 text-[#10a37f] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </section>

        <section id="demo" className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white">Upload once, then ask anything your leadership would ask.</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            You get answers grounded in your spreadsheet, PDF, or brief, plus a decision brief you can share. No slide deck required for the first conversation.
          </p>
          <div className="mt-6 space-y-3">
            {[
              'Drop a CSV, Excel export, PDF, or Word doc, or start from a template with sample data.',
              'Ask in normal language: trends, risks, follow-ups, or a one-page summary for execs.',
              'Open the workspace anytime; your session picks up with the same files and chat history.',
            ].map((line) => (
              <div key={line} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10a37f] mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-300">{line}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="use-cases">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Use cases</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">Support, revenue, and GTM, each with a ready-made starting file.</h2>
          </div>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Customer Support Bot',
                body: 'Turn a support brief into priority queues, escalation plans, and grounded response drafts.',
                templateId: 'support-copilot' as WorkspaceTemplateId,
              },
              {
                title: 'Data Extraction Pipeline',
                body: 'Load structured revenue data and surface metrics, risks, and next actions for leadership.',
                templateId: 'sales-analyst' as WorkspaceTemplateId,
              },
              {
                title: 'Content Writer',
                body: 'Start from a campaign brief and generate launch messaging with a reusable agent workflow.',
                templateId: 'content-writer' as WorkspaceTemplateId,
              },
            ].map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6">
                <h3 className="font-display text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{card.body}</p>
                <button
                  type="button"
                  onClick={() => void handleLoadTemplate(card.templateId)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#5eead4] hover:text-white transition-colors"
                >
                  Load this template
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="trust" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Trust &amp; privacy</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">Your documents stay yours, and answers trace back to them.</h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Teams evaluating AI for internal reports need to know who can see data and how answers are grounded. This section is here for that conversation; details are summarized on the Security page.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: 'Scoped access',
                body: 'Optional Google sign-in keeps workspaces separated per account when enabled in your deployment.',
              },
              {
                title: 'Saved work',
                body: 'Sessions and uploads persist so you are not re-uploading the same file every visit.',
              },
              {
                title: 'Reviewable output',
                body: 'Responses can cite the files you uploaded so reviewers can sanity-check before anything goes to leadership.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/[0.08] bg-zinc-900/35 p-6">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-[#10a37f]/12 via-zinc-900/70 to-zinc-950 px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Start from a template</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">Skip the blank page: open a realistic sample and chat right away.</h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Every template loads real rows or text into your workspace so the first question you ask already feels like a weekly ops or sales review.
              </p>
            </div>
            <div className="grid gap-3">
              {WORKSPACE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => void handleLoadTemplate(template.id)}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 text-left transition-colors hover:bg-black/35 hover:border-[#10a37f]/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{template.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{template.description}</p>
                    </div>
                    {isLoadingTemplate === template.id ? <Loader2 className="w-4 h-4 animate-spin text-[#10a37f]" /> : <ArrowRight className="w-4 h-4 text-[#10a37f]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {recentChats.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Continue working</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => void onLoadChat(chat)}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-900/35 p-4 text-left transition-colors hover:border-[#10a37f]/25 hover:bg-zinc-900/60"
                >
                  <p className="text-sm font-medium text-white truncate">{toReadableConversationTitle(chat.title)}</p>
                  <p className="mt-2 text-xs text-zinc-500">{chat.messages.length} messages</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-zinc-500">
          <div>
            <p className="text-zinc-300">AgentFlow</p>
            <p className="mt-1 text-xs">Turn weekly business documents into summaries, risks, and actions your team can act on.</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/security" className="hover:text-white transition-colors">Security &amp; data</a>
            <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href={LINKEDIN_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
