'use client'

import { Database, FileText, Trash2, Info, Github, Linkedin, Sparkles } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { FileUpload } from './FileUpload'
import { DatasetInfo, DocumentInfo } from '@/lib/agents/types'
import { sampleSalesData, sampleResearchText } from '@/lib/sample-data'

interface SidebarProps {
  datasets: DatasetInfo[]
  documents: DocumentInfo[]
  onDataUpload: (data: Array<Record<string, unknown>>, fileName: string) => void
  onDocumentUpload: (text: string, fileName: string) => void
  onClearAll: () => void
}

export function Sidebar({
  datasets,
  documents,
  onDataUpload,
  onDocumentUpload,
  onClearAll,
}: SidebarProps) {
  const hasData = datasets.length > 0 || documents.length > 0

  const loadSampleData = () => {
    onDataUpload(sampleSalesData, 'sample_sales_data.csv')
  }

  const loadSampleDocument = () => {
    onDocumentUpload(sampleResearchText, 'deep_learning_survey.pdf')
  }

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">File Manager</h2>
        <p className="text-sm text-gray-500">Upload and manage your files</p>
      </div>

      {/* Quick Start */}
      {!hasData && (
        <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-primary-50 to-violet-50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-800">Quick Start</span>
          </div>
          <div className="space-y-2">
            <Button
              onClick={loadSampleData}
              variant="primary"
              size="sm"
              className="w-full"
            >
              <Database className="w-4 h-4 mr-2" />
              Load Sample Sales Data
            </Button>
            <Button
              onClick={loadSampleDocument}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Load Sample Research Paper
            </Button>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="p-4 border-b border-gray-200">
        <FileUpload
          onDataUpload={onDataUpload}
          onDocumentUpload={onDocumentUpload}
        />
      </div>

      {/* Loaded Files */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Datasets */}
        {datasets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Files ({datasets.length})
            </h3>
            <div className="space-y-2">
              {datasets.map((dataset) => (
                <Card key={dataset.name} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {dataset.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dataset.rows.toLocaleString()} rows • {dataset.columns.length} columns
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents ({documents.length})
            </h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.name} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-cyan-100 rounded">
                      <FileText className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.wordCount.toLocaleString()} words
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {doc.keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasData && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <Info className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              No files loaded yet.
              <br />
              Upload a file to get started.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {hasData && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="w-full text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </Button>
        )}
        
        <div className="flex items-center justify-center gap-4 pt-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Linkedin className="w-5 h-5" />
          </a>
        </div>
      </div>
    </aside>
  )
}
