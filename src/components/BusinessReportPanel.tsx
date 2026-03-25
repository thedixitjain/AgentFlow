'use client'

import { useState } from 'react'
import { ClipboardList, Copy, Download, RefreshCcw, X } from 'lucide-react'
import type { WorkspaceReport } from '@/lib/api'
import { buildBusinessReportMarkdown, downloadBusinessReport } from '@/lib/reporting'
import { toReadableDocumentName } from '@/lib/businessUx'

interface BusinessReportPanelProps {
  report: WorkspaceReport | null
  reportCount: number
  isGenerating: boolean
  activeDocument?: string | null
  onGenerate: () => void
  onClose: () => void
  onNavigateHome?: () => void
}

export function BusinessReportPanel({
  report,
  reportCount,
  isGenerating,
  activeDocument,
  onGenerate,
  onClose,
  onNavigateHome,
}: BusinessReportPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!report) {
      return
    }

    await navigator.clipboard.writeText(buildBusinessReportMarkdown(report))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-96 bg-[#171717] border-l border-[#2f2f2f] flex flex-col h-full animate-fade-in">
      <div className="p-4 border-b border-[#2f2f2f] flex items-center justify-between">
        <div className="min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs font-semibold text-[#10a37f] hover:text-[#5eead4] mb-1 transition-colors cursor-pointer"
            >
              AgentFlow
            </button>
          )}
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#10a37f]" />
            <p className="text-sm font-semibold text-[#ececec]">Brief</p>
          </div>
          <p className="text-xs text-[#8e8e8e]">Summary, risks, and suggested actions from this chat.</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-[#2f2f2f] transition-colors">
          <X className="w-4 h-4 text-[#8e8e8e]" />
        </button>
      </div>

      <div className="p-4 border-b border-[#2f2f2f] space-y-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#10a37f] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0d8a6a] disabled:opacity-60"
        >
          <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {report ? (isGenerating ? 'Refreshing brief...' : 'Refresh brief') : (isGenerating ? 'Generating brief...' : 'Generate brief')}
        </button>

        {report && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-zinc-800/80"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => downloadBusinessReport(report)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-zinc-800/80"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {report ? (
          <>
            <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{report.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(report.generatedAt).toLocaleString()} · {report.source === 'llm' ? 'AI-generated' : 'Heuristic fallback'}
                  </p>
                </div>
                <span className="rounded-full border border-[#10a37f]/25 bg-[#10a37f]/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#5eead4]">
                  {report.confidence} confidence
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Focus</p>
                  <p className="mt-1 text-zinc-200">{report.focus}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Overview</p>
                  <p className="mt-1 text-zinc-300 leading-relaxed">{report.overview}</p>
                </div>
              </div>
            </section>

            {[
              { title: 'Highlights', items: report.highlights },
              { title: 'Risks', items: report.risks },
              { title: 'Recommended Actions', items: report.actions },
              { title: 'Follow-up Questions', items: report.followUps },
            ].map((section) => (
              <section key={section.title} className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{section.title}</p>
                <ul className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <li key={`${section.title}-${item}`} className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-3 text-sm leading-relaxed text-zinc-200">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : (
          <section className="rounded-xl border border-white/[0.06] bg-zinc-900/25 p-5 text-center">
            <p className="text-sm text-zinc-400">
              {activeDocument
                ? `Generate a brief from ${toReadableDocumentName(activeDocument)} and this chat.`
                : 'Generate a brief from this chat when you are ready.'}
            </p>
          </section>
        )}
      </div>

      <div className="p-4 border-t border-[#2f2f2f]">
        <p className="text-xs text-zinc-500">
          {reportCount > 0
            ? `${reportCount} brief${reportCount === 1 ? '' : 's'} saved in this workspace.`
            : 'No brief saved yet.'}
        </p>
      </div>
    </div>
  )
}
