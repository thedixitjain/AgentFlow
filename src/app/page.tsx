'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Sidebar } from '@/components/Sidebar'
import { Chat } from '@/components/Chat'
import { Landing } from '@/components/Landing'
import { InsightsPanel } from '@/components/InsightsPanel'
import { BusinessReportPanel } from '@/components/BusinessReportPanel'
import { SystemInsightsPanel } from '@/components/SystemInsightsPanel'
import { AppToast, type AppToastState } from '@/components/AppToast'
import { DocumentFile, Message, ChatHistory, DocumentInsight } from '@/lib/types'
import { buildWorkspaceTemplateDocument, getWorkspaceTemplate, type WorkspaceTemplateId } from '@/lib/demoTemplates'
import { generateInsights } from '@/lib/insights'
import { api, type Session, type Document as ApiDocument, type Message as ApiMessage, type SystemStats, type EvalRun, type PersistenceStatus, type WorkspaceReport } from '@/lib/api'
import { syncWorkspaceIdentity } from '@/lib/api'
import {
  CHAT_CONNECTION_ERROR_MESSAGE,
  toReadableConversationTitle,
  toReadableDocumentName,
  toUserFacingAppError,
} from '@/lib/businessUx'
import { isProductionApiLikelyMisconfigured } from '@/lib/env'
import { isSessionNotFoundError } from '@/lib/sessionErrors'
import { scrollWindowToTop } from '@/lib/scrollToTop'
import { clearWorkspaceState, loadWorkspaceState, resolveRestoredDocumentName, saveWorkspaceState } from '@/lib/workspaceState'

function mapDocument(document: ApiDocument): DocumentFile {
  return {
    id: document.id,
    name: document.name,
    type: document.type as DocumentFile['type'],
    size: document.size,
    content: document.content,
    data: document.data,
    columns: document.columns,
    uploadedAt: new Date(document.metadata.uploadedAt),
  }
}

function mapMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    agentType: message.agentType,
    sources: message.sources,
  }
}

function mapSessionToHistory(session: Session): ChatHistory {
  const firstUserMessage = session.messages.find(message => message.role === 'user')?.content
  const title = toReadableConversationTitle(
    firstUserMessage?.slice(0, 50) || toReadableDocumentName(session.documents[0]?.name) || 'New Chat',
    'New Chat',
  )

  return {
    id: session.id,
    title,
    messages: session.messages.map(mapMessage),
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
  }
}

export default function Home() {
  const { data: session, status: authStatus } = useSession()
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeDocument, setActiveDocument] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  const [currentChatId, setCurrentChatId] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [insights, setInsights] = useState<DocumentInsight[]>([])
  const [showInsights, setShowInsights] = useState(false)
  const [reports, setReports] = useState<WorkspaceReport[]>([])
  const [showBusinessReport, setShowBusinessReport] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showSystemInsights, setShowSystemInsights] = useState(false)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentEval, setRecentEval] = useState<EvalRun | null>(null)
  const [appError, setAppError] = useState<string | null>(null)
  const [configWarning, setConfigWarning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [toast, setToast] = useState<AppToastState | null>(null)
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus | null>(null)
  const previousAuthIdentity = useRef<string | null | undefined>(undefined)

  const authUser = session?.user ?? null
  const authIdentity = authUser?.email?.toLowerCase() ?? null
  const isGoogleAuthConfigured = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

  useEffect(() => {
    setConfigWarning(isProductionApiLikelyMisconfigured())
  }, [])

  const pushToast = useCallback((message: string, tone: AppToastState['tone'] = 'info') => {
    setToast({
      id: Date.now(),
      message,
      tone,
    })
  }, [])

  const reportAppError = useCallback((error: unknown, fallback?: string) => {
    const message = toUserFacingAppError(error, fallback)
    setAppError(message)
    pushToast(message, 'error')
    return message
  }, [pushToast])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => {
      setToast(current => (current?.id === toast.id ? null : current))
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [toast])

  const refreshPersistenceStatus = useCallback(async () => {
    try {
      const status = await api.getPersistenceStatus()
      setPersistenceStatus(status)
    } catch (error) {
      console.error('Failed to load persistence status:', error)
    }
  }, [])

  const queuePersistenceSync = useCallback(async (sessionId: string) => {
    try {
      const result = await api.persistSession(sessionId)
      setPersistenceStatus(result.status)
    } catch (error) {
      console.warn('Persistence sync stub failed:', error)
    }
  }, [])

  useEffect(() => {
    void refreshPersistenceStatus()
  }, [refreshPersistenceStatus])

  const refreshChatHistory = useCallback(async () => {
    try {
      const sessions = await api.listSessions()
      setChatHistory(sessions.map(mapSessionToHistory))
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'loading') {
      return
    }

    syncWorkspaceIdentity(authIdentity)

    if (previousAuthIdentity.current === undefined) {
      previousAuthIdentity.current = authIdentity
      return
    }

    if (previousAuthIdentity.current === authIdentity) {
      return
    }

    previousAuthIdentity.current = authIdentity
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
    setCurrentChatId('')
    setInsights([])
    setReports([])
    setShowInsights(false)
    setShowBusinessReport(true)
    setShowSystemInsights(false)
    setShowLanding(true)
    clearWorkspaceState()
    void refreshChatHistory()

    pushToast(
      authIdentity
        ? 'Signed in with Google. Your workspace is now scoped to your account.'
        : 'Signed out. AgentFlow switched back to the local workspace.',
      'info',
    )
  }, [authIdentity, authStatus, pushToast, refreshChatHistory])

  const refreshSystemInsights = useCallback(async () => {
    try {
      const stats = await api.getStats()
      setSystemStats(stats)
      setRecentEval(stats.latestEval)
    } catch (error) {
      console.error('Failed to refresh system insights:', error)
    }
  }, [])

  const runEvalSuite = useCallback(async () => {
    try {
      const evalRun = await api.runEvalSuite()
      setRecentEval(evalRun)
      await refreshSystemInsights()
    } catch (error) {
      console.error('Failed to run eval suite:', error)
    }
  }, [refreshSystemInsights])

  const loadSession = useCallback(
    async (
      sessionId: string,
      options?: {
        preferredDocument?: string | null
        showInsights?: boolean
        showBusinessReport?: boolean
        showSystemInsights?: boolean
      }
    ) => {
      let session: Session
      try {
        session = await api.getSession(sessionId)
      } catch (error) {
        if (isSessionNotFoundError(error)) {
          await refreshChatHistory()
        }
        throw error
      }

      const nextDocuments = session.documents.map(mapDocument)
      const nextMessages = session.messages.map(mapMessage)

      setCurrentChatId(session.id)
      setDocuments(nextDocuments)
      setMessages(nextMessages)
      setReports(session.reports || [])
      const restoredDocumentName = resolveRestoredDocumentName(
        nextDocuments.map(document => document.name),
        options?.preferredDocument || null,
      )
      setActiveDocument(restoredDocumentName)
      setShowLanding(false)
      setIsSidebarOpen(false)
      setShowBusinessReport(
        options?.showBusinessReport ?? (((session.reports?.length ?? 0) > 0) || nextDocuments.length > 0),
      )
      setShowSystemInsights(Boolean(options?.showSystemInsights))

      const activeDoc = nextDocuments.find(document => document.name === restoredDocumentName)
      if (activeDoc) {
        const docInsights = generateInsights(activeDoc)
        setInsights(docInsights)
        setShowInsights((options?.showInsights ?? true) && docInsights.length > 0)
      } else {
        setInsights([])
        setShowInsights(false)
      }
    },
    [refreshChatHistory]
  )

  const createNewSession = useCallback(async () => {
    const session = await api.createSession()
    setCurrentChatId(session.id)
    setDocuments([])
      setMessages([])
      setActiveDocument(null)
      setInsights([])
      setReports([])
      setShowInsights(false)
      setShowBusinessReport(true)
      setShowSystemInsights(false)
      setShowLanding(false)
    setIsSidebarOpen(false)
    await refreshChatHistory()
    void queuePersistenceSync(session.id)
    return session.id
  }, [queuePersistenceSync, refreshChatHistory])

  const ensureSession = useCallback(async () => {
    if (currentChatId) {
      try {
        await api.getSession(currentChatId)
        return currentChatId
      } catch (error) {
        if (!isSessionNotFoundError(error)) throw error
        setCurrentChatId('')
        setMessages([])
        setDocuments([])
        setActiveDocument(null)
        setInsights([])
        setReports([])
        setShowInsights(false)
        setShowBusinessReport(true)
        await refreshChatHistory()
      }
    }
    return createNewSession()
  }, [createNewSession, currentChatId, refreshChatHistory])

  useEffect(() => {
    if (authStatus === 'loading') {
      return
    }

    let cancelled = false

    const restoreWorkspace = async () => {
      const savedWorkspace = loadWorkspaceState()

      try {
        const sessions = await api.listSessions()
        if (cancelled) {
          return
        }

        setChatHistory(sessions.map(mapSessionToHistory))

        if (!savedWorkspace?.lastSessionId) {
          return
        }

        await loadSession(savedWorkspace.lastSessionId, {
          preferredDocument: savedWorkspace.activeDocument,
          showInsights: savedWorkspace.showInsights,
          showBusinessReport: savedWorkspace.showBusinessReport,
          showSystemInsights: savedWorkspace.showSystemInsights,
        })

        if (!cancelled) {
          pushToast('Restored your last workspace.', 'info')
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        if (savedWorkspace?.lastSessionId && isSessionNotFoundError(error)) {
          clearWorkspaceState()
          pushToast('Your last workspace was no longer available, so AgentFlow opened on the landing page.', 'info')
          return
        }

        console.error('Failed to restore workspace:', error)
      }
    }

    void restoreWorkspace()

    return () => {
      cancelled = true
    }
  }, [authStatus, loadSession, pushToast])

  /** After idle / deploy, server session list can change; refresh when user returns to the tab. */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshChatHistory()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshChatHistory])

  useEffect(() => {
    if (showSystemInsights) {
      void refreshSystemInsights()
    }
  }, [refreshSystemInsights, showSystemInsights])

  useEffect(() => {
    if (showLanding || !currentChatId) {
      clearWorkspaceState()
      return
    }

    saveWorkspaceState({
      lastSessionId: currentChatId,
      activeDocument,
      showInsights: showInsights && insights.length > 0,
      showBusinessReport,
      showSystemInsights,
    })
  }, [activeDocument, currentChatId, insights.length, showBusinessReport, showInsights, showLanding, showSystemInsights])

  const handleFileUpload = useCallback(async (file: DocumentFile) => {
    setAppError(null)
    try {
      const sessionId = await ensureSession()

      const saved = await api.createParsedDocument(sessionId, {
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
        data: file.data,
        columns: file.columns,
      })

      const mappedDocument = mapDocument(saved)
      setDocuments(prev => {
        const existingIndex = prev.findIndex(document => document.id === mappedDocument.id)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = mappedDocument
          return next
        }
        return [...prev, mappedDocument]
      })
      setActiveDocument(mappedDocument.name)
      setShowLanding(false)
      setIsSidebarOpen(false)
      setShowBusinessReport(true)

      const docInsights = generateInsights(mappedDocument)
      setInsights(docInsights)
      setShowInsights(docInsights.length > 0)
      await refreshChatHistory()
      void queuePersistenceSync(sessionId)
    } catch (error) {
      console.error('Failed to save document:', error)
      reportAppError(error, 'We could not save that document. Please try again.')
    }
  }, [ensureSession, queuePersistenceSync, refreshChatHistory, reportAppError])

  const handleUploadError = useCallback((message: string) => {
    const friendlyMessage = toUserFacingAppError(message, 'We could not upload that file. Please try again.')
    setAppError(friendlyMessage)
    pushToast(friendlyMessage, 'error')
  }, [pushToast])

  const handleLoadTemplate = useCallback(async (templateId: WorkspaceTemplateId) => {
    try {
      const template = getWorkspaceTemplate(templateId)
      await handleFileUpload(buildWorkspaceTemplateDocument(templateId))
      pushToast(`${template.name} template loaded.`, 'success')
    } catch (error) {
      console.error('Failed to load template:', error)
      reportAppError(error, 'We could not load that template. Please try again.')
    }
  }, [handleFileUpload, pushToast, reportAppError])

  const handleAuthClick = useCallback((mode: 'login' | 'signup') => {
    if (!isGoogleAuthConfigured) {
      pushToast(
        'Sign-in isn’t configured here. Enable Google auth in your environment to use accounts, or continue without signing in.',
        'info',
      )
      return
    }

    void signIn('google', { callbackUrl: '/' })
    if (mode === 'signup') {
      pushToast('Continue with Google to create your workspace.', 'info')
    }
  }, [isGoogleAuthConfigured, pushToast])

  const handleSignOut = useCallback(() => {
    void signOut({ callbackUrl: '/' })
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    setAppError(null)
    let sessionId: string
    try {
      sessionId = await ensureSession()
    } catch (error) {
      console.error('Failed to open session:', error)
      reportAppError(error, 'We could not open the workspace. Please try again.')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const streamingId = `stream-${Date.now()}`
    const applyRetryableAssistantError = () => {
      setMessages(prev => prev.map(message =>
        message.id === streamingId
          ? {
              ...message,
              content: CHAT_CONNECTION_ERROR_MESSAGE,
              isStreaming: false,
              canRetry: true,
              retryPrompt: content,
            }
          : message
      ))
    }

    setMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }])

    try {
      const activeDoc = documents.find(document => document.name === activeDocument)

      await api.streamMessage(
        sessionId,
        content,
        (chunk) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, content: message.content + chunk }
              : message
          ))
        },
        (agentUsed) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, agentType: agentUsed, isStreaming: false }
              : message
          ))
        },
        activeDoc?.id,
        (sources) => {
          setMessages(prev => prev.map(message =>
            message.id === streamingId
              ? { ...message, sources }
              : message
          ))
        },
        () => applyRetryableAssistantError(),
      )

      try {
        await loadSession(sessionId)
      } catch (syncError) {
        if (isSessionNotFoundError(syncError)) {
          console.warn('Post-reply sync skipped: session not found on server')
        } else {
          console.warn('Post-reply sync failed', syncError)
        }
      }
      await refreshChatHistory()
      void queuePersistenceSync(sessionId)
    } catch (error) {
      console.error('Failed to send message:', error)
      applyRetryableAssistantError()
      pushToast(CHAT_CONNECTION_ERROR_MESSAGE, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [activeDocument, documents, ensureSession, loadSession, pushToast, queuePersistenceSync, refreshChatHistory, reportAppError])

  const handleRetryMessage = useCallback((content: string) => {
    void handleSendMessage(content)
  }, [handleSendMessage])

  const handleGenerateReport = useCallback(async () => {
    setAppError(null)

    let sessionId = currentChatId
    if (!sessionId) {
      try {
        sessionId = await ensureSession()
      } catch (error) {
        console.error('Failed to open session for report generation:', error)
        reportAppError(error, 'We could not open the workspace report. Please try again.')
        return
      }
    }

    setIsGeneratingReport(true)

    try {
      const activeDoc = documents.find(document => document.name === activeDocument)
      const report = await api.generateReport(sessionId, activeDoc?.id)
      setReports(prev => [report, ...prev.filter(existing => existing.id !== report.id)])
      setShowBusinessReport(true)
      pushToast('Decision brief updated.', 'success')
      void queuePersistenceSync(sessionId)
    } catch (error) {
      console.error('Failed to generate workspace report:', error)
      reportAppError(error, 'We could not generate the decision brief. Please try again.')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [activeDocument, currentChatId, documents, ensureSession, pushToast, queuePersistenceSync, reportAppError])

  const handleRemoveDocument = useCallback((name: string) => {
    void (async () => {
      const target = documents.find(document => document.name === name)
      if (target?.id && currentChatId) {
        try {
          await api.deleteDocument(currentChatId, target.id)
        } catch (error) {
          console.error('Failed to delete document:', error)
        }
      }

      setDocuments(prev => prev.filter(document => document.name !== name))
      if (activeDocument === name) {
        const remaining = documents.filter(document => document.name !== name)
        const nextActive = remaining.length > 0 ? remaining[0].name : null
        setActiveDocument(nextActive)

        if (nextActive) {
          const nextDocument = remaining[0]
          const docInsights = generateInsights(nextDocument)
          setInsights(docInsights)
          setShowInsights(docInsights.length > 0)
        } else {
          setInsights([])
          setShowInsights(false)
        }
      }
    })()
  }, [activeDocument, currentChatId, documents])

  const handleNewChat = useCallback(() => {
    void createNewSession()
  }, [createNewSession])

  const handleLoadChat = useCallback(
    async (chat: ChatHistory) => {
      setAppError(null)
      try {
        await loadSession(chat.id)
      } catch (error) {
        console.error('Failed to load chat:', error)
        reportAppError(error, 'We could not open that conversation. Please try again.')
      }
    },
    [loadSession, reportAppError]
  )

  const handleLandingStart = useCallback(async () => {
    setAppError(null)
    try {
      await createNewSession()
    } catch (error) {
      console.error('Failed to start workspace:', error)
      reportAppError(error, 'We could not start a new workspace. Please try again.')
    }
  }, [createNewSession, reportAppError])

  const handleDeleteChat = useCallback((id: string) => {
    void (async () => {
      try {
        await api.deleteSession(id)
        await refreshChatHistory()
        if (currentChatId === id) {
          setMessages([])
          setDocuments([])
          setActiveDocument(null)
          setCurrentChatId('')
          setInsights([])
          setReports([])
          setShowInsights(false)
          setShowBusinessReport(true)
          setShowSystemInsights(false)
          setShowLanding(true)
          clearWorkspaceState()
        }
      } catch (error) {
        console.error('Failed to delete session:', error)
      }
    })()
  }, [currentChatId, refreshChatHistory])

  const handleBackToHome = useCallback(() => {
    setShowLanding(true)
    setMessages([])
    setDocuments([])
    setActiveDocument(null)
    setCurrentChatId('')
    setInsights([])
    setReports([])
    setShowInsights(false)
    setShowBusinessReport(true)
    setShowSystemInsights(false)
    setAppError(null)
    setIsSidebarOpen(false)
    clearWorkspaceState()
    queueMicrotask(() => scrollWindowToTop())
    requestAnimationFrame(() => scrollWindowToTop())
  }, [])

  const latestReport = reports[0] || null

  if (showLanding) {
    return (
      <Landing
        onStart={handleLandingStart}
        onFileUpload={handleFileUpload}
        onUploadError={handleUploadError}
        recentChats={chatHistory.slice(0, 3)}
        onLoadChat={handleLoadChat}
        onLoadTemplate={handleLoadTemplate}
        onAuthClick={handleAuthClick}
        onSignOut={handleSignOut}
        errorMessage={appError}
        onDismissError={() => setAppError(null)}
        configWarning={configWarning}
        persistenceStatus={persistenceStatus}
        authUser={authUser}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--chat-bg)]">
      <AppToast toast={toast} onDismiss={() => setToast(null)} />
      {appError && (
        <div className="shrink-0 flex items-start gap-2 px-4 py-2.5 bg-red-950/90 border-b border-red-500/30 text-red-100 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="flex-1 leading-snug">{appError}</p>
          <button
            type="button"
            onClick={() => setAppError(null)}
            className="p-1 rounded hover:bg-red-900/80"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          documents={documents}
          activeDocument={activeDocument}
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          onFileUpload={handleFileUpload}
          onSelectDocument={(name) => {
            setActiveDocument(name)
            const document = documents.find(item => item.name === name)
            if (document) {
              const docInsights = generateInsights(document)
              setInsights(docInsights)
              setShowInsights(docInsights.length > 0)
            }
          }}
          onRemoveDocument={handleRemoveDocument}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onBackToHome={handleBackToHome}
          onOpenSystemInsights={() => {
            setShowSystemInsights(true)
            void refreshSystemInsights()
          }}
          onLoadTemplate={handleLoadTemplate}
          onAuthClick={handleAuthClick}
          onSignOut={handleSignOut}
          onUploadError={handleUploadError}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          persistenceStatus={persistenceStatus}
          authUser={authUser}
        />

        <Chat
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onRetryMessage={handleRetryMessage}
          onOpenReport={() => setShowBusinessReport(true)}
          reportCount={reports.length}
          isGeneratingReport={isGeneratingReport}
          hasDocument={!!activeDocument}
          documentName={activeDocument || undefined}
          onNavigateHome={handleBackToHome}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onLoadTemplate={handleLoadTemplate}
        />

        {showBusinessReport && (
          <BusinessReportPanel
            report={latestReport}
            reportCount={reports.length}
            isGenerating={isGeneratingReport}
            activeDocument={activeDocument}
            onGenerate={handleGenerateReport}
            onClose={() => setShowBusinessReport(false)}
            onNavigateHome={handleBackToHome}
          />
        )}

        {showInsights && insights.length > 0 && (
          <InsightsPanel
            insights={insights}
            onClose={() => setShowInsights(false)}
            onNavigateHome={handleBackToHome}
          />
        )}

        {showSystemInsights && (
          <SystemInsightsPanel
            stats={systemStats}
            recentEval={recentEval}
            onRefresh={refreshSystemInsights}
            onRunEval={runEvalSuite}
            onClose={() => setShowSystemInsights(false)}
            onNavigateHome={handleBackToHome}
          />
        )}
      </div>
    </div>
  )
}
