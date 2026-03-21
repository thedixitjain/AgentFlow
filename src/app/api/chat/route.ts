import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
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

function formatClientError(message: string): string {
  if (/429|quota|rate limit/i.test(message)) {
    return 'The configured AI provider is rate limited or over quota. Update billing or switch to a fresh API key and retry.'
  }

  if (/403|api key|unauthorized|permission|authentication/i.test(message)) {
    return 'The configured AI API key is invalid or does not have access to the requested model.'
  }

  return 'The AI request failed. Check the server logs for the full provider error.'
}

function buildUserPrompt(systemPrompt: string, contextBlock: string, message: string): string {
  const questionBlock = contextBlock ? `${contextBlock}User question: ${message}` : message
  return `${systemPrompt}\n\n${questionBlock}`
}

async function streamWithGroq(
  groqApiKey: string,
  history: ChatRequest['history'],
  prompt: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const groq = new Groq({ apiKey: groqApiKey })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1024,
    stream: true,
    messages: [
      ...history.slice(-6).map(entry => ({
        role: entry.role as 'user' | 'assistant',
        content: entry.content,
      })),
      { role: 'user' as const, content: prompt },
    ],
  })

  for await (const chunk of completion) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
      )
    }
  }
}

async function streamWithGemini(
  geminiApiKey: string,
  history: ChatRequest['history'],
  prompt: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
  const mapped = history.slice(-6).map(entry => ({
    role: entry.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: entry.content }],
  }))
  const chatHistory = mapped.findIndex(entry => entry.role === 'user') >= 0
    ? mapped.slice(mapped.findIndex(entry => entry.role === 'user'))
    : []

  const modelErrors: string[] = []

  for (const modelName of modelNames) {
    const model = genAI.getGenerativeModel({ model: modelName })
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    })

    try {
      const result = await chat.sendMessageStream(prompt)
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
          )
        }
      }
      return
    } catch (error) {
      modelErrors.push(error instanceof Error ? error.message : `Gemini model ${modelName} failed`)
    }
  }

  const quotaError = modelErrors.find(error => /quota|429/i.test(error))
  throw new Error(quotaError || modelErrors[modelErrors.length - 1] || 'Gemini request failed')
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, document, history, mode } = body

    const groqApiKey = process.env.GROQ_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!groqApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY.' },
        { status: 500 }
      )
    }

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
        const formatVal = (value: unknown): string => {
          if (value === null || value === undefined) return ''
          if (typeof value === 'number' && value > 10000 && value < 100000) {
            const date = new Date((value - 25569) * 86400 * 1000)
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            }
          }
          return String(value)
        }

        const fullText = document.data.slice(0, 100).map((row, index) =>
          `Row ${index + 1}: ${document.columns!.map(column => `${column}: ${formatVal(row[column])}`).join(', ')}`
        ).join('\n')

        context = `FULL DATA (${document.data.length} rows):\n${fullText}\n\n---\nRAG matches:\n${context}`
      }

      contextBlock = `\n\nCONTEXT FROM DOCUMENT:\n${context}\n\n`
    }

    const systemPrompt = 'You are AgentFlow, a senior AI analyst. Be concise, direct, and professional. Answer only what was asked. Extract exact information from the provided context. If the answer is not in the document context, say "Not found in document".'
    const prompt = buildUserPrompt(systemPrompt, contextBlock, message)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (groqApiKey) {
            await streamWithGroq(groqApiKey, history, prompt, controller, encoder)
          } else if (geminiApiKey) {
            await streamWithGemini(geminiApiKey, history, prompt, controller, encoder)
          }

          if (ragSources.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ sources: ragSources.map(source => ({ content: source.content.slice(0, 200) + (source.content.length > 200 ? '...' : ''), score: source.score })) })}\n\n`)
            )
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream error'
          console.error('AI stream error:', error)
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: formatClientError(message) })}\n\n`))
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
        Connection: 'keep-alive',
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
