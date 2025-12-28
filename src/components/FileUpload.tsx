'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, FileText, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onDataUpload: (data: Array<Record<string, unknown>>, fileName: string) => void
  onDocumentUpload: (text: string, fileName: string) => void
}

export function FileUpload({ onDataUpload, onDocumentUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase()
    
    try {
      if (fileName.endsWith('.csv')) {
        const Papa = (await import('papaparse')).default
        const text = await file.text()
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              onDataUpload(results.data as Array<Record<string, unknown>>, file.name)
              setUploadStatus({ type: 'success', message: `Loaded ${file.name} with ${results.data.length} rows` })
            }
          },
          error: (error: Error) => {
            setUploadStatus({ type: 'error', message: `Error parsing CSV: ${error.message}` })
          },
        })
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet)
        
        if (data.length > 0) {
          onDataUpload(data as Array<Record<string, unknown>>, file.name)
          setUploadStatus({ type: 'success', message: `Loaded ${file.name} with ${data.length} rows` })
        }
      } else if (fileName.endsWith('.pdf')) {
        // For PDF, we'll use a simplified text extraction
        // In production, you'd want to use pdf.js or similar
        const text = await extractPdfText(file)
        onDocumentUpload(text, file.name)
        setUploadStatus({ type: 'success', message: `Loaded ${file.name}` })
      } else if (fileName.endsWith('.txt')) {
        const text = await file.text()
        onDocumentUpload(text, file.name)
        setUploadStatus({ type: 'success', message: `Loaded ${file.name}` })
      } else {
        setUploadStatus({ type: 'error', message: 'Unsupported file type. Please upload CSV, Excel, PDF, or TXT files.' })
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: `Error processing file: ${error}` })
    }

    setTimeout(() => setUploadStatus({ type: null, message: '' }), 3000)
  }, [onDataUpload, onDocumentUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
    e.target.value = ''
  }, [processFile])

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        )}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'p-3 rounded-full transition-colors',
            isDragging ? 'bg-primary-100' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'w-6 h-6',
              isDragging ? 'text-primary-600' : 'text-gray-500'
            )} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500 mt-1">
              CSV, Excel, PDF, or TXT files
            </p>
          </div>
        </div>
      </div>

      {uploadStatus.type && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg text-sm animate-fade-in',
          uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          {uploadStatus.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs font-medium text-emerald-800">Data Files</p>
            <p className="text-xs text-emerald-600">CSV, Excel</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-cyan-50 rounded-lg">
          <FileText className="w-5 h-5 text-cyan-600" />
          <div>
            <p className="text-xs font-medium text-cyan-800">Documents</p>
            <p className="text-xs text-cyan-600">PDF, TXT</p>
          </div>
        </div>
      </div>
    </div>
  )
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText
  } catch (error) {
    console.error('PDF extraction error:', error)
    return 'Unable to extract text from PDF. Please try a different file.'
  }
}
