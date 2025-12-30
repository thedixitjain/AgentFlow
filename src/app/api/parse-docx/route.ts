import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = result.value.trim()

    return NextResponse.json({
      text: text || 'Could not extract text from DOCX.',
      messages: result.messages,
    })
  } catch (error) {
    console.error('DOCX parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse DOCX' },
      { status: 500 }
    )
  }
}
