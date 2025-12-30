import { NextRequest, NextResponse } from 'next/server'
import { rag } from '@/lib/rag'

interface ChatRequest {
  message: string
  document: {
    id?: string
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
    let ragSources: Array<{ content: string; score: number }> = []
    
    if (mode === 'document' && document) {
      const docId = document.id || document.name
      
      // Index document if not already indexed
      if (!rag.isIndexed(docId)) {
        rag.index(
          docId,
          document.content || null,
          document.data || null,
          document.columns || null
        )
      }
      
      // RAG search
      ragSources = rag.search(message, docId, 5)
      const context = rag.buildContext(ragSources)

      systemPrompt = `You are AgentFlow, an AI document analyst using RAG (Retrieval-Augmented Generation).

RETRIEVED CONTEXT:
${context}

DOCUMENT INFO:
Name: ${document.name}
Type: ${document.type.toUpperCase()}
${document.data ? `Rows: ${document.data.length}` : ''}
${document.columns ? `Columns: ${document.columns.join(', ')}` : ''}

INSTRUCTIONS:
- Answer based ONLY on the retrieved context above
- Cite sources using [Source N] format when referencing specific information
- If the context doesn't contain the answer, say so clearly
- Be precise with numbers and calculations
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

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
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

    // Transform the stream to include sources at the end
    const encoder = new TextEncoder()
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk)
      },
      async flush(controller) {
        // Send sources after the main response
        if (ragSources.length > 0) {
          const sourcesData = JSON.stringify({ 
            sources: ragSources.map(s => ({
              content: s.content.slice(0, 200) + (s.content.length > 200 ? '...' : ''),
              score: s.score,
            }))
          })
          controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`))
        }
      }
    })

    const stream = response.body?.pipeThrough(transformStream)

    return new Response(stream, {
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
