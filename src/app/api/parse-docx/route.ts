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
    
    // Simple DOCX text extraction
    // DOCX files are ZIP archives containing XML
    let text = ''
    
    try {
      // Try to find and extract text from the document.xml
      const decoder = new TextDecoder('utf-8')
      const content = decoder.decode(uint8Array)
      
      // Look for text content between XML tags
      // This is a simplified extraction - for production, use a proper library
      const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
      
      if (textMatches) {
        text = textMatches
          .map(match => {
            const innerMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
            return innerMatch ? innerMatch[1] : ''
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      // If no text found, try alternative extraction
      if (!text) {
        // Extract any readable text from the binary
        const rawText = decoder.decode(uint8Array)
        const cleanText = rawText
          .replace(/<[^>]+>/g, ' ')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        if (cleanText.length > 100) {
          text = cleanText.slice(0, 50000)
        }
      }
    } catch {
      // Fallback: try to extract any readable content
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const rawContent = decoder.decode(uint8Array)
      text = rawContent
        .replace(/<[^>]+>/g, ' ')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50000)
    }

    if (!text || text.length < 50) {
      text = 'This DOCX file could not be fully parsed. The document may be encrypted, corrupted, or in an unsupported format. Please try converting it to a plain text file (.txt) for better results.'
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error('DOCX parsing error:', error)
    return NextResponse.json({ 
      text: 'Error parsing DOCX file. Please try converting to TXT format.',
      error: 'Failed to parse DOCX' 
    }, { status: 200 })
  }
}
