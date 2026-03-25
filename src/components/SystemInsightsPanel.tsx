'use client'

import { useState } from 'react'
import { Activity, BarChart3, Brain, Gauge, RefreshCcw, ShieldCheck, X } from 'lucide-react'
import type { EvalRun, SystemStats } from '@/lib/api'
import { getSimpleSystemSummary } from '@/lib/businessUx'

interface SystemInsightsPanelProps {
  stats: SystemStats | null
  recentEval: EvalRun | null
  onRefresh: () => Promise<void>
  onRunEval: () => Promise<void>
  onClose: () => void
  /** Return to main landing */
  onNavigateHome?: () => void
}

export function SystemInsightsPanel({
  stats,
  recentEval,
  onRefresh,
  onRunEval,
  onClose,
  onNavigateHome,
}: SystemInsightsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRunningEval, setIsRunningEval] = useState(false)
  const [viewMode, setViewMode] = useState<'simple' | 'developer'>('simple')
  const simpleSummary = getSimpleSystemSummary(stats, recentEval)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRunEval = async () => {
    setIsRunningEval(true)
    try {
      await onRunEval()
    } finally {
      setIsRunningEval(false)
    }
  }

  return (
    <div className="w-96 bg-[#171717] border-l border-[#2f2f2f] flex flex-col h-full">
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
          <p className="text-sm font-semibold text-[#ececec]">Workspace Status</p>
          <p className="text-xs text-[#8e8e8e]">A quick business view by default, with developer metrics available when you need them.</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-[#2f2f2f] transition-colors">
          <X className="w-4 h-4 text-[#8e8e8e]" />
        </button>
      </div>

      <div className="p-4 border-b border-[#2f2f2f] space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#1f1f1f] p-1">
          <button
            type="button"
            onClick={() => setViewMode('simple')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'simple'
                ? 'bg-[#10a37f] text-white'
                : 'text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-[#ececec]'
            }`}
          >
            Simple View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('developer')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === 'developer'
                ? 'bg-[#2f2f2f] text-white'
                : 'text-[#8e8e8e] hover:bg-[#2f2f2f] hover:text-[#ececec]'
            }`}
          >
            Developer View
          </button>
        </div>

        <div className="flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#2f2f2f] hover:bg-[#3a3a3a] text-sm text-[#ececec] transition-colors disabled:opacity-60"
        >
          <RefreshCcw className="w-4 h-4" />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
          {viewMode === 'developer' && (
            <button
              onClick={handleRunEval}
              disabled={isRunningEval}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#10a37f] hover:bg-[#0d8a6a] text-sm text-white transition-colors disabled:opacity-60"
            >
              <Brain className="w-4 h-4" />
              {isRunningEval ? 'Running...' : 'Run Eval'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === 'simple' ? (
          <>
            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <Gauge className="w-4 h-4 text-[#10a37f]" />
                <span className="text-sm font-medium">Business Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[#8e8e8e]">System status</p>
                  <p className={`font-semibold ${simpleSummary.statusTone === 'good' ? 'text-[#5eead4]' : 'text-[#fbbf24]'}`}>
                    {simpleSummary.statusLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[#8e8e8e]">Documents indexed</p>
                  <p className="text-[#ececec] font-semibold">{simpleSummary.documentsIndexed}</p>
                </div>
                <div>
                  <p className="text-[#8e8e8e]">Monthly cost</p>
                  <p className="text-[#ececec] font-semibold">{simpleSummary.monthlyCost}</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#8e8e8e]">{simpleSummary.guidance}</p>
            </section>

            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm font-medium">Quality Check</span>
              </div>
              {recentEval ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8e8e8e]">Latest score</span>
                    <span className="text-[#ececec]">{(recentEval.averageScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e8e8e]">Checks passed</span>
                    <span className="text-[#ececec]">{recentEval.passedCases}/{recentEval.totalCases}</span>
                  </div>
                  <p className="pt-2 text-xs leading-relaxed text-[#8e8e8e]">
                    Open Developer View if you want to inspect provider mix, routing details, and telemetry.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#8e8e8e]">No diagnostic run yet. Refresh to load the latest workspace health snapshot.</p>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <Gauge className="w-4 h-4 text-[#10a37f]" />
                <span className="text-sm font-medium">Runtime Snapshot</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#8e8e8e]">Sessions</p>
                  <p className="text-[#ececec] font-semibold">{stats?.sessions ?? 0}</p>
                </div>
                <div>
                  <p className="text-[#8e8e8e]">RAG Chunks</p>
                  <p className="text-[#ececec] font-semibold">{stats?.rag.totalChunks ?? 0}</p>
                </div>
                <div>
                  <p className="text-[#8e8e8e]">Budget Used</p>
                  <p className="text-[#ececec] font-semibold">${stats?.budget.used.toFixed(4) ?? '0.0000'}</p>
                </div>
                <div>
                  <p className="text-[#8e8e8e]">Active Tasks</p>
                  <p className="text-[#ececec] font-semibold">{stats?.tasks.active ?? 0}</p>
                </div>
              </div>
            </section>

            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <BarChart3 className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-sm font-medium">Retrieval Telemetry</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Queries tracked</span>
                  <span className="text-[#ececec]">{stats?.telemetry.retrieval.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Avg top score</span>
                  <span className="text-[#ececec]">{((stats?.telemetry.retrieval.averageTopScore ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Avg retrieval</span>
                  <span className="text-[#ececec]">{(stats?.telemetry.retrieval.averageRetrievalLatencyMs ?? 0).toFixed(1)} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Avg generation</span>
                  <span className="text-[#ececec]">{(stats?.telemetry.retrieval.averageGenerationLatencyMs ?? 0).toFixed(1)} ms</span>
                </div>
              </div>
            </section>

            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <Activity className="w-4 h-4 text-[#8b5cf6]" />
                <span className="text-sm font-medium">Routing and Providers</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Route decisions</span>
                  <span className="text-[#ececec]">{stats?.telemetry.routes.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e8e8e]">Provider calls</span>
                  <span className="text-[#ececec]">{stats?.telemetry.providers.total ?? 0}</span>
                </div>
                <div>
                  <p className="text-[#8e8e8e] mb-1">Provider mix</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats?.telemetry.providers.breakdown ?? {}).map(([provider, count]) => (
                      <span key={provider} className="px-2 py-1 text-xs bg-[#1f1f1f] text-[#ececec]">
                        {provider}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="p-4 bg-[#2f2f2f] border border-[#424242]">
              <div className="flex items-center gap-2 mb-3 text-[#ececec]">
                <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-sm font-medium">Latest Eval</span>
              </div>
              {recentEval ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8e8e8e]">Suite</span>
                    <span className="text-[#ececec]">{recentEval.suiteId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e8e8e]">Average score</span>
                    <span className="text-[#ececec]">{(recentEval.averageScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8e8e8e]">Passed</span>
                    <span className="text-[#ececec]">{recentEval.passedCases}/{recentEval.totalCases}</span>
                  </div>
                  <div className="pt-2 space-y-2">
                    {recentEval.results.slice(0, 3).map(result => (
                      <div key={result.caseId} className="p-2 bg-[#1f1f1f]">
                        <p className="text-[#ececec] text-xs font-medium">{result.title}</p>
                        <p className="text-[#8e8e8e] text-xs mt-1">
                          Score {(result.score * 100).toFixed(0)}% · {result.generationTimeMs} ms
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#8e8e8e]">No eval run yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
