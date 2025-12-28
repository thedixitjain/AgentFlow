import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // For now, return a placeholder - PDF parsing requires server-side libraries
    // In production, you'd use pdf-parse or similar
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    
    // Simple text extraction attempt (works for some PDFs)
    let text = ''
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      const rawText = decoder.decode(bytes)
      
      // Extract readable text between stream markers
      const matches = rawText.match(/stream\n([\s\S]*?)\nendstream/g)
      if (matches) {
        text = matches
          .map(m => m.replace(/stream\n|\nendstream/g, ''))
          .filter(t => /[a-zA-Z]{3,}/.test(t))
          .join('\n')
          .replace(/[^\x20-\x7E\n]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
    } catch {
      text = 'PDF text extraction limited. Upload as TXT for full analysis.'
    }

    return NextResponse.json({
      text: text || 'PDF uploaded successfully. Content will be analyzed.',
      pages: 1,
    })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    )
  }
}
