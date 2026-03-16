import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
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

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, document, history, mode } = body

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']

    let systemPrompt = ''
    let ragSources: Array<{ content: string; score: number }> = []

    let contextBlock = ''
    if (mode === 'document' && document) {
      const docId = document.id || document.name

      rag.index(
        docId,
        document.content || null,
        document.data || null,
        document.columns || null
      )

      const rowCount = document.data?.length ?? 0
      const topK = rowCount > 0 && rowCount <= 100 ? 20 : 8
      ragSources = rag.search(message, docId, topK)
      let context = rag.buildContext(ragSources)

      if (document.data && document.columns && document.data.length <= 100 && ragSources.length > 0 && ragSources[0].score < 0.3) {
        const formatVal = (v: unknown): string => {
          if (v === null || v === undefined) return ''
          if (typeof v === 'number' && v > 10000 && v < 100000) {
            const d = new Date((v - 25569) * 86400 * 1000)
            if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          }
          return String(v)
        }
        const fullText = document.data.slice(0, 100).map((row, i) =>
          `Row ${i + 1}: ${document!.columns!.map(c => `${c}: ${formatVal(row[c])}`).join(', ')}`
        ).join('\n')
        context = `FULL DATA (${document.data.length} rows):\n${fullText}\n\n---\nRAG matches:\n${context}`
      }
      contextBlock = `\n\nCONTEXT FROM DOCUMENT:\n${context}\n\n`
    }

    systemPrompt = `You are AgentFlow, a senior AI analyst. Be concise, direct, and professional. Answer ONLY what was asked. Be succinct. Extract exact information from context. If info isn't in context, say "Not found in document".`

    // Gemini requires first message to be from 'user' - trim any leading assistant messages
    const mapped = history.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const chatHistory = mapped.findIndex(m => m.role === 'user') >= 0
      ? mapped.slice(mapped.findIndex(m => m.role === 'user'))
      : []

    const userMessage = contextBlock ? `${contextBlock}User question: ${message}` : message

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const runWithModel = async (modelIndex: number): Promise<boolean> => {
          const model = genAI.getGenerativeModel({ model: modelNames[modelIndex] })
          const chat = model.startChat({
            history: chatHistory,
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
            systemInstruction: systemPrompt,
          })
          try {
            const result = await chat.sendMessageStream(userMessage)
            for await (const chunk of result.stream) {
              const text = chunk.text()
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`))
              }
            }
            return true
          } catch {
            return false
          }
        }

        try {
          let success = false
          for (let i = 0; i < modelNames.length; i++) {
            success = await runWithModel(i)
            if (success) break
          }
          if (!success) throw new Error('All Gemini models failed')

          if (ragSources.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources: ragSources.map(s => ({ content: s.content.slice(0, 200) + (s.content.length > 200 ? '...' : ''), score: s.score })) })}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Stream error'
          console.error('Gemini stream error:', err)
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`))
          } finally {
            controller.close()
          }
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
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    )
  }
}
