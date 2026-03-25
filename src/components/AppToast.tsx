'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastTone = 'error' | 'success' | 'info'

export interface AppToastState {
  id: number
  message: string
  tone: ToastTone
}

interface AppToastProps {
  toast: AppToastState | null
  onDismiss: () => void
}

const TONE_STYLES: Record<
  ToastTone,
  { container: string; icon: React.ReactNode; iconColor: string; title: string }
> = {
  error: {
    container: 'border-red-500/30 bg-red-950/90 text-red-50',
    icon: <AlertCircle className="w-4 h-4" />,
    iconColor: 'text-red-300',
    title: 'Action failed',
  },
  success: {
    container: 'border-emerald-500/30 bg-emerald-950/90 text-emerald-50',
    icon: <CheckCircle2 className="w-4 h-4" />,
    iconColor: 'text-emerald-300',
    title: 'Done',
  },
  info: {
    container: 'border-sky-500/30 bg-sky-950/90 text-sky-50',
    icon: <Info className="w-4 h-4" />,
    iconColor: 'text-sky-300',
    title: 'Notice',
  },
}

export function AppToast({ toast, onDismiss }: AppToastProps) {
  if (!toast) {
    return null
  }

  const tone = TONE_STYLES[toast.tone]

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm">
      <div
        className={`pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur px-4 py-3 ${tone.container}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${tone.iconColor}`}>{tone.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{tone.title}</p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 opacity-80 transition-colors hover:bg-white/10 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
