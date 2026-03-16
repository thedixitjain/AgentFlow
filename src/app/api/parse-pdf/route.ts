import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    let text = ''

    try {
      // Attempt to extract readable text from PDF binary
      const decoder = new TextDecoder('latin1')
      const raw = decoder.decode(bytes)

      // Extract text from PDF content streams
      const streamMatches = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) || []
      const textParts: string[] = []

      for (const match of streamMatches) {
        const content = match.replace(/stream\r?\n|\r?\nendstream/g, '')
        // Extract readable ASCII text
        const readable = content
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, ' ')
          .trim()
        if (readable.length > 20 && /[a-zA-Z]{3,}/.test(readable)) {
          textParts.push(readable)
        }
      }

      // Also try extracting BT/ET text blocks (PDF text operators)
      const btMatches = raw.match(/BT[\s\S]*?ET/g) || []
      for (const block of btMatches) {
        const tjMatches = block.match(/\(([^)]+)\)\s*Tj/g) || []
        const tjText = tjMatches
          .map(m => m.replace(/\(|\)\s*Tj/g, ''))
          .join(' ')
        if (tjText.trim().length > 5) {
          textParts.push(tjText.trim())
        }
      }

      text = textParts.join('\n').replace(/\s+/g, ' ').trim()
    } catch {
      text = ''
    }

    if (!text || text.length < 50) {
      text =
        'PDF text extraction was limited. For best results, copy the text from your PDF and upload as a .txt file.'
    }

    return NextResponse.json({ text, pages: 1 })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
