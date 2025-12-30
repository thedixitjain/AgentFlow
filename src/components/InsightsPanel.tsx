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
    <div className="w-80 bg-[#171717] border-l border-[#2f2f2f] flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-[#2f2f2f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#10a37f]" />
          <span className="font-semibold text-[#ececec]">Insights</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#2f2f2f] transition-colors"
        >
          <X className="w-4 h-4 text-[#8e8e8e]" />
        </button>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 bg-[#2f2f2f] border border-[#424242]"
          >
            {insight.type === 'metric' && (
              <>
                <p className="text-xs text-[#8e8e8e] mb-1">{insight.title}</p>
                <p className="text-2xl font-bold text-[#ececec] mb-1">{insight.value}</p>
                {insight.description && (
                  <p className="text-xs text-[#8e8e8e]">{insight.description}</p>
                )}
              </>
            )}

            {insight.type === 'chart' && insight.data && (
              <>
                <p className="text-sm font-semibold mb-3 text-[#ececec]">{insight.title}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insight.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#424242" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#8e8e8e' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#8e8e8e' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2f2f2f',
                          border: '1px solid #424242',
                          fontSize: '12px',
                          color: '#ececec',
                        }}
                      />
                      <Bar dataKey="value" fill="#10a37f" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {insight.description && (
                  <p className="text-xs text-[#8e8e8e] mt-2">{insight.description}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2f2f2f]">
        <div className="flex items-center gap-2 text-xs text-[#8e8e8e]">
          <TrendingUp className="w-3 h-3" />
          <span>Auto-generated insights</span>
        </div>
      </div>
    </div>
  )
}
