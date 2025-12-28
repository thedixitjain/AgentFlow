'use client'

import { X, BarChart2, TrendingUp } from 'lucide-react'
import { DocumentInsight } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface InsightsPanelProps {
  insights: DocumentInsight[]
  onClose: () => void
}

export function InsightsPanel({ insights, onClose }: InsightsPanelProps) {
  return (
    <div className="w-80 bg-zinc-950 border-l border-zinc-900 flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Insights</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            {insight.type === 'metric' && (
              <>
                <p className="text-xs text-zinc-500 mb-1">{insight.title}</p>
                <p className="text-2xl font-bold mb-1">{insight.value}</p>
                {insight.description && (
                  <p className="text-xs text-zinc-600">{insight.description}</p>
                )}
              </>
            )}

            {insight.type === 'chart' && insight.data && (
              <>
                <p className="text-sm font-semibold mb-3">{insight.title}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insight.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {insight.description && (
                  <p className="text-xs text-zinc-600 mt-2">{insight.description}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <TrendingUp className="w-3 h-3" />
          <span>Auto-generated insights</span>
        </div>
      </div>
    </div>
  )
}
