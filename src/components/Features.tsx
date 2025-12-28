'use client'

import { Bot, Database, FileText, Sparkles, Zap, Shield, BarChart3, MessageSquare } from 'lucide-react'
import { Card, CardContent } from './ui/Card'

const features = [
  {
    icon: Bot,
    title: 'Multi-Agent Architecture',
    description: 'Intelligent orchestrator routes queries to specialized AI agents for optimal results.',
    color: 'violet',
  },
  {
    icon: Database,
    title: 'Data Intelligence',
    description: 'Analyze CSV and Excel files with natural language. Get instant insights and visualizations.',
    color: 'emerald',
  },
  {
    icon: FileText,
    title: 'Research Assistant',
    description: 'Process PDFs and documents. Extract summaries, keywords, and answer questions.',
    color: 'cyan',
  },
  {
    icon: BarChart3,
    title: 'Smart Visualizations',
    description: 'Auto-generated charts and graphs based on your queries. Bar, line, and pie charts.',
    color: 'amber',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language',
    description: 'Ask questions in plain English. No SQL or programming knowledge required.',
    color: 'pink',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'All processing happens in your browser. Your data never leaves your device.',
    color: 'blue',
  },
  {
    icon: Zap,
    title: 'Instant Results',
    description: 'No server round-trips. Get answers in milliseconds with client-side processing.',
    color: 'orange',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Advanced NLP for query understanding, summarization, and keyword extraction.',
    color: 'purple',
  },
]

const colorClasses: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  amber: 'bg-amber-100 text-amber-600',
  pink: 'bg-pink-100 text-pink-600',
  blue: 'bg-blue-100 text-blue-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
}

export function Features() {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A complete AI-powered platform for data analysis and research document processing,
            built with modern web technologies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} hover className="p-6">
              <CardContent className="p-0">
                <div className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
