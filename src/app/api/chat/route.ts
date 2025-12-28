import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

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

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body: ChatRequest = await request.json()
    const { message, document, history, mode } = body

    if (!process.env.GROQ_API_KEY) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"content":"API key not configured. Please add GROQ_API_KEY to environment variables."}\n\n'))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
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

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages,
      temperature: 0.4,
      max_tokens: 2048,
      stream: true,
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: 'Error generating response' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"content":"Error processing request. Please try again."}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}
