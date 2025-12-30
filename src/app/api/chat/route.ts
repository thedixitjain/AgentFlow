import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
  document: {
    name: string
    type: string
    content?: string
    data?: Record<string, unknown>[]
    columns?: string[]
  } | null
  history: Array<{ role: string; content: string }>
  mode: 'document' | 'chat'
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, document, history, mode } = body

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    let systemPrompt = ''
    
    if (mode === 'document' && document) {
      let documentContext = ''
      if (document.type === 'csv' || document.type === 'xlsx') {
        const dataPreview = document.data?.slice(0, 30) || []
        documentContext = `
DOCUMENT: ${document.name}
TYPE: Spreadsheet (${document.type.toUpperCase()})
COLUMNS: ${document.columns?.join(', ')}
TOTAL ROWS: ${document.data?.length || 0}

DATA SAMPLE:
${JSON.stringify(dataPreview, null, 2)}
`
      } else {
        documentContext = `
DOCUMENT: ${document.name}
TYPE: ${document.type.toUpperCase()}

CONTENT:
${document.content?.slice(0, 8000) || 'Content not available'}
`
      }

      systemPrompt = `You are AgentFlow, an AI document analyst. Analyze the document and provide accurate, helpful answers.

${documentContext}

Guidelines:
- Answer based on the actual document data
- Be precise with numbers and calculations
- Keep responses clear and concise
- Use markdown formatting for readability`
    } else {
      systemPrompt = `You are AgentFlow, a helpful AI assistant. You can help with:
- Coding and technical questions
- Data analysis concepts
- General knowledge
- Writing and explanations

Be concise, helpful, and use markdown formatting.`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // Call Groq API directly with fetch
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.4,
        max_tokens: 2048,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', response.status, errorText)
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      )
    }

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    )
  }
}
