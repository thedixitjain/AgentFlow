import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    // Simple PDF text extraction
    // This extracts readable text from PDF binary
    let text = ''
    
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const content = decoder.decode(uint8Array)
      
      // Extract text between stream markers (common in PDFs)
      const streamMatches = content.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)
      
      if (streamMatches) {
        for (const stream of streamMatches) {
          // Try to extract readable text
          const cleanStream = stream
            .replace(/stream[\r\n]+/, '')
            .replace(/[\r\n]+endstream/, '')
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (cleanStream.length > 20 && /[a-zA-Z]{3,}/.test(cleanStream)) {
            text += cleanStream + '\n\n'
          }
        }
      }
      
      // Also try to extract text from BT/ET blocks (text objects)
      const textObjects = content.match(/BT[\s\S]*?ET/g)
      if (textObjects) {
        for (const obj of textObjects) {
          // Extract text from Tj and TJ operators
          const tjMatches = obj.match(/\(([^)]+)\)\s*Tj/g)
          if (tjMatches) {
            for (const tj of tjMatches) {
              const textMatch = tj.match(/\(([^)]+)\)/)
              if (textMatch) {
                text += textMatch[1] + ' '
              }
            }
          }
        }
      }
      
      // Clean up the extracted text
      text = text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/([.!?])\s+/g, '$1\n\n')
        .trim()
      
      // If still no good text, try raw extraction
      if (text.length < 100) {
        const rawText = content
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        // Find sequences of readable words
        const words = rawText.match(/[a-zA-Z]{4,}/g)
        if (words && words.length > 50) {
          text = words.join(' ')
        }
      }
    } catch {
      // Fallback extraction
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(uint8Array)
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Limit text length
    text = text.slice(0, 100000)

    if (!text || text.length < 50) {
      text = 'This PDF could not be fully parsed. It may be scanned/image-based, encrypted, or in an unsupported format. For best results with scanned PDFs, please use OCR software to convert to text first.'
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error('PDF parsing error:', error)
    return NextResponse.json({ 
      text: 'Error parsing PDF file. The file may be corrupted or in an unsupported format.',
      error: 'Failed to parse PDF' 
    }, { status: 200 })
  }
}
