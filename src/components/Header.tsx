'use client'

import { Bot, Sparkles, Database, FileText } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">
              AgentFlow System
            </h1>
            <p className="text-xs text-gray-500">
              Intelligent Data & Research Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <AgentStatus
            icon={Database}
            label="Data Agent"
            color="emerald"
          />
          <AgentStatus
            icon={FileText}
            label="Research Agent"
            color="cyan"
          />
          <AgentStatus
            icon={Sparkles}
            label="Orchestrator"
            color="violet"
          />
        </div>
      </div>
    </header>
  )
}

function AgentStatus({
  icon: Icon,
  label,
  color,
}: {
  icon: typeof Bot
  label: string
  color: 'emerald' | 'cyan' | 'violet'
}) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    violet: 'bg-violet-100 text-violet-600',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-xs text-green-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Active
        </p>
      </div>
    </div>
  )
}
