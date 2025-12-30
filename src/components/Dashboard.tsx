'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  Cpu, 
  Database, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Zap,
  TrendingUp
} from 'lucide-react'

interface AgentState {
  id: string
  type: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  metrics: {
    tasksCompleted: number
    avgResponseTime: number
    errorCount: number
  }
}

interface DashboardProps {
  agents: AgentState[]
  stats: {
    sessions: number
    tasks: { pending: number; active: number }
    budget: { used: number; limit: number; percentage: number }
    uptime: number
  } | null
  onRefresh: () => void
}

export function Dashboard({ agents, stats, onRefresh }: DashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-[#10a37f]'
      case 'processing': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-[#8e8e8e]'
    }
  }

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'orchestrator': return <Zap className="w-4 h-4" />
      case 'ingest': return <Database className="w-4 h-4" />
      case 'question': return <Activity className="w-4 h-4" />
      case 'verifier': return <CheckCircle className="w-4 h-4" />
      case 'summarizer': return <TrendingUp className="w-4 h-4" />
      default: return <Cpu className="w-4 h-4" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#ececec]">System Dashboard</h2>
          <p className="text-sm text-[#8e8e8e]">Multi-Agent System Status</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-[#2f2f2f] hover:bg-[#3a3a3a] text-[#ececec] text-sm transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
            <div className="flex items-center gap-2 text-[#8e8e8e] mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs uppercase">Active Sessions</span>
            </div>
            <p className="text-2xl font-bold text-[#ececec]">{stats.sessions}</p>
          </div>

          <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
            <div className="flex items-center gap-2 text-[#8e8e8e] mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-xs uppercase">Tasks</span>
            </div>
            <p className="text-2xl font-bold text-[#ececec]">
              {stats.tasks.active}
              <span className="text-sm text-[#8e8e8e] ml-1">/ {stats.tasks.pending} pending</span>
            </p>
          </div>

          <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
            <div className="flex items-center gap-2 text-[#8e8e8e] mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs uppercase">Budget Used</span>
            </div>
            <p className="text-2xl font-bold text-[#ececec]">
              ${stats.budget.used.toFixed(2)}
              <span className="text-sm text-[#8e8e8e] ml-1">/ ${stats.budget.limit}</span>
            </p>
            <div className="mt-2 h-1 bg-[#424242]">
              <div 
                className={`h-full ${stats.budget.percentage > 80 ? 'bg-red-500' : 'bg-[#10a37f]'}`}
                style={{ width: `${Math.min(stats.budget.percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-[#2f2f2f] border border-[#424242]">
            <div className="flex items-center gap-2 text-[#8e8e8e] mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-[#ececec]">{formatUptime(stats.uptime)}</p>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div>
        <h3 className="text-sm font-medium text-[#8e8e8e] uppercase tracking-wide mb-3">
          Agent Status ({agents.length} agents)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 bg-[#2f2f2f] border border-[#424242] hover:border-[#8e8e8e] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#424242] text-[#ececec]">
                    {getAgentIcon(agent.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#ececec] capitalize">{agent.type}</p>
                    <p className="text-xs text-[#8e8e8e]">{agent.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 ${getStatusColor(agent.status)}`} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-[#ececec]">{agent.metrics.tasksCompleted}</p>
                  <p className="text-xs text-[#8e8e8e]">Tasks</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#ececec]">
                    {agent.metrics.avgResponseTime > 0 
                      ? `${(agent.metrics.avgResponseTime / 1000).toFixed(1)}s`
                      : '-'
                    }
                  </p>
                  <p className="text-xs text-[#8e8e8e]">Avg Time</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${agent.metrics.errorCount > 0 ? 'text-red-400' : 'text-[#ececec]'}`}>
                    {agent.metrics.errorCount}
                  </p>
                  <p className="text-xs text-[#8e8e8e]">Errors</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-[#8e8e8e]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#10a37f]" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500" />
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500" />
          <span>Error</span>
        </div>
      </div>
    </div>
  )
}
