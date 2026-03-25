'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Plus, FileText, FileSpreadsheet, X, Upload, Home, MessageSquare, Trash2, BarChart3, Search, LogIn, UserPlus, LayoutTemplate, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { DocumentFile, ChatHistory } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import { WORKSPACE_TEMPLATES, type WorkspaceTemplateId } from '@/lib/demoTemplates'
import type { PersistenceStatus } from '@/lib/api'
import {
  buildParsedTextDocument,
  getUploadErrorMessage,
  toReadableConversationTitle,
  toReadableDocumentName,
  toUserFacingAppError,
} from '@/lib/businessUx'

interface AuthUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface SidebarProps {
  documents: DocumentFile[]
  activeDocument: string | null
  chatHistory: ChatHistory[]
  currentChatId: string
  onFileUpload: (file: DocumentFile) => void | Promise<void>
  onSelectDocument: (name: string) => void
  onRemoveDocument: (name: string) => void
  onNewChat: () => void
  onLoadChat: (chat: ChatHistory) => void
  onDeleteChat: (id: string) => void
  onBackToHome: () => void
  onOpenSystemInsights: () => void
  onLoadTemplate: (templateId: WorkspaceTemplateId) => void
  onAuthClick: (mode: 'login' | 'signup') => void
  onSignOut: () => void
  onUploadError?: (message: string) => void
  isMobileOpen: boolean
  onCloseMobile: () => void
  persistenceStatus: PersistenceStatus | null
  authUser: AuthUser | null
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
  onOpenSystemInsights,
  onLoadTemplate,
  onAuthClick,
  onSignOut,
  onUploadError,
  isMobileOpen,
  onCloseMobile,
  persistenceStatus,
  authUser,
  currentChatId,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const readableFileName = toReadableDocumentName(file.name)
    const showUploadError = async (fallbackMessage: string, response?: Response | null) => {
      const message = await getUploadErrorMessage(response || null, fallbackMessage)
      onUploadError?.(message)
    }

    try {
      if (ext === 'csv') {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => {
              const data = results.data as Record<string, unknown>[]
              void Promise.resolve(
                onFileUpload({
                  name: file.name,
                  type: 'csv',
                  size: file.size,
                  data: data.filter(row => Object.values(row).some(v => v)),
                  columns: results.meta.fields || [],
                  uploadedAt: new Date(),
                }),
              )
                .then(resolve)
                .catch(reject)
            },
            error: (error: Error) => reject(error),
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

        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          await showUploadError(
            `We couldn't upload ${readableFileName}. Please try another PDF or export it as text.`,
            response,
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

        const response = await fetch('/api/parse-docx', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          await showUploadError(
            `We couldn't upload ${readableFileName}. Please try another Word file or export it as text.`,
            response,
          )
          return
        }

        const result = (await response.json()) as { text?: string }
        await onFileUpload(buildParsedTextDocument(file, 'docx', result.text))
        return
      }

      if (ext === 'pptx' || ext === 'ppt') {
        const text = await file.text().catch(() => '')
        await onFileUpload({
          name: file.name,
          type: 'pptx',
          size: file.size,
          content: text || 'PowerPoint uploaded.',
          uploadedAt: new Date(),
        })
        return
      }

      onUploadError?.(
        'That file type is not supported yet. Please upload CSV, Excel, PDF, Word, PowerPoint, or text.',
      )
    } catch (error) {
      onUploadError?.(
        toUserFacingAppError(
          error,
          `We couldn't upload ${readableFileName}. Please try again with a different file.`,
        ),
      )
    }
  }, [onFileUpload, onUploadError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(processFile),
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
  })

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredDocuments = documents.filter((doc) =>
    !normalizedQuery ||
    doc.name.toLowerCase().includes(normalizedQuery) ||
    toReadableDocumentName(doc.name).toLowerCase().includes(normalizedQuery),
  )
  const filteredChats = chatHistory.filter((chat) =>
    !normalizedQuery ||
    toReadableConversationTitle(chat.title).toLowerCase().includes(normalizedQuery) ||
    chat.messages.some((message) => message.content.toLowerCase().includes(normalizedQuery)),
  )

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] shrink-0 bg-[var(--sidebar-bg)] border-r border-white/[0.06] flex flex-col h-full transform transition-transform duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black/40' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 pb-2 border-b border-white/[0.05]">
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault()
                onBackToHome()
                onCloseMobile()
              }}
              className="group flex items-center gap-2 px-1 mb-2 w-full text-left rounded-lg py-1 -mx-0.5 hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)] cursor-pointer relative z-20"
              aria-label="AgentFlow, go to landing page"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 transition-transform group-hover:scale-[1.02] border border-white/[0.08]">
                <Image
                  src="/logo.png"
                  alt="AgentFlow Logo"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-zinc-100 leading-tight">AgentFlow</p>
                <p className="text-[10px] text-zinc-500 leading-snug group-hover:text-zinc-400">AI workspace</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onCloseMobile}
              className="mt-1 rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100 transition-colors md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onBackToHome()
              onCloseMobile()
            }}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] transition-colors text-left cursor-pointer relative z-20"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Back to landing</span>
          </Link>
          {authUser ? (
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
              <div className="flex items-center gap-3">
                {authUser.image ? (
                  <Image
                    src={authUser.image}
                    alt={authUser.name || authUser.email || 'Signed-in user'}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10a37f]/15 text-xs font-semibold text-[#5eead4]">
                    {(authUser.name || authUser.email || 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{authUser.name || 'Google user'}</p>
                  <p className="truncate text-[11px] text-zinc-500">{authUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-3 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-1 mt-3">
              <button
                type="button"
                onClick={() => onAuthClick('login')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log in
              </button>
              <button
                type="button"
                onClick={() => onAuthClick('signup')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10a37f] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0d8a6a]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign up
              </button>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-3 pb-3">
          <button
            onClick={() => {
              onNewChat()
              onCloseMobile()
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#10a37f] hover:bg-[#0d8a6a] text-white text-sm font-medium transition-colors shadow-md shadow-[#10a37f]/15"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => {
              onOpenSystemInsights()
              onCloseMobile()
            }}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-100 text-sm font-medium transition-colors border border-white/[0.06]"
          >
            <BarChart3 className="w-4 h-4" />
            Workspace Status
          </button>
          <div className="mt-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations and files"
              className="w-full rounded-xl border border-white/[0.08] bg-zinc-900/70 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#10a37f]/45"
            />
          </div>
        </div>

        {/* Upload Area */}
        <div className="px-3 pb-3">
          <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
            Documents
          </p>
          <div
            {...getRootProps()}
            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-[#10a37f] bg-[#10a37f]/10' 
                : 'border-white/[0.12] hover:border-[#10a37f]/40 bg-zinc-900/30'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 mx-auto mb-2 text-zinc-500" />
            <p className="text-xs text-zinc-400 font-medium">
              {isDragActive ? 'Drop file here' : 'Upload CSV, Excel, PDF, TXT'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
              Ground answers in your business documents
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4">
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
            Templates
          </p>
          <div className="space-y-1">
            {WORKSPACE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onLoadTemplate(template.id)
                  onCloseMobile()
                }}
                className="w-full rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3 py-3 text-left transition-colors hover:border-[#10a37f]/25 hover:bg-zinc-900/75"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{template.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{template.description}</p>
                  </div>
                  <LayoutTemplate className="w-4 h-4 text-[#10a37f] shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
        {documents.length === 0 && chatHistory.length === 0 && !normalizedQuery && (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-zinc-900/25 px-4 py-5">
            <p className="text-sm font-medium text-zinc-100">Welcome! Upload your first document to get started.</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              You can also load a template above to explore a ready-made workspace before adding your own data.
            </p>
          </div>
        )}
        {/* Documents */}
        {filteredDocuments.length > 0 && (
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 px-1">
              Documents
            </p>
            <div className="space-y-1">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.name}
                  onClick={() => {
                    onSelectDocument(doc.name)
                    onCloseMobile()
                  }}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${
                    activeDocument === doc.name 
                      ? 'bg-[#10a37f]/12 border-[#10a37f]/25 text-zinc-100' 
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                  }`}
                >
                  {doc.type === 'csv' || doc.type === 'xlsx' ? (
                    <FileSpreadsheet className="w-4 h-4 text-[#10a37f] flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#b4b4b4] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{toReadableDocumentName(doc.name)}</p>
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
        {filteredChats.length > 0 && (
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1 px-1">
              Conversations
            </p>
            <p className="text-[9px] text-zinc-600 mb-2 px-1 leading-relaxed">
              Search narrows conversations by title or message content.
            </p>
            <div className="space-y-1">
              {filteredChats.slice(0, 10).map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent ${
                    currentChatId === chat.id
                      ? 'bg-[#10a37f]/10 border-[#10a37f]/20 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                  }`}
                  onClick={() => {
                    onLoadChat(chat)
                    onCloseMobile()
                  }}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{toReadableConversationTitle(chat.title)}</p>
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
        {normalizedQuery && filteredDocuments.length === 0 && filteredChats.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-zinc-900/30 px-4 py-5 text-center">
            <p className="text-sm text-zinc-300">No matches for “{searchQuery}”</p>
            <p className="mt-1 text-xs text-zinc-600">Try a session title, file name, or a keyword from the conversation.</p>
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          {persistenceStatus && (
            <div className="rounded-xl border border-white/[0.08] bg-zinc-900/50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Saving</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {persistenceStatus.mode === 'database-ready'
                      ? 'Synced to server'
                      : 'Saved on this device'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                {persistenceStatus.mode === 'database-ready'
                  ? 'Use the same account elsewhere to continue this workspace.'
                  : 'Other browsers or devices won’t see this session until server sync is on.'}
              </p>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
            Conversations, templates, and saved work in one place
          </p>
        </div>
      </aside>
    </>
  )
}
