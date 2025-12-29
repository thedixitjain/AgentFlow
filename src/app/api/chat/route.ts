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
    totalRows?: number
  } | null
  history: Array<{ role: string; content: string }>
}

function buildSystemPrompt(document: ChatRequest['document']): string {
  if (!document) {
    return `You are AgentFlow, a friendly and professional AI assistant specialized in document analysis and data intelligence.

PERSONALITY:
- Be conversational, warm, and helpful
- Give clear, well-structured responses
- Use markdown formatting for readability (headers, lists, bold, code blocks)
- Be concise but thorough

CAPABILITIES:
- Document analysis (PDF, Word, Text files)
- Data analysis (CSV, Excel files)
- Summarization and key point extraction
- Statistical calculations and trend identification
- Question answering about uploaded content

When no document is uploaded, you can:
- Explain your capabilities
- Help users understand what types of analysis you can perform
- Answer general questions
- Guide users on how to get the most out of AgentFlow

Always be helpful and guide users toward uploading documents for analysis.`
  }

  if (document.type === 'csv' || document.type === 'xlsx') {
    const sampleData = document.data?.slice(0, 50) || []
    const columns = document.columns || []
    
    return `You are AgentFlow, an expert data analyst AI assistant.

DOCUMENT CONTEXT:
- File: ${document.name}
- Type: ${document.type.toUpperCase()} Spreadsheet
- Total Rows: ${document.totalRows?.toLocaleString() || document.data?.length || 'Unknown'}
- Columns: ${columns.join(', ')}

DATA SAMPLE (first ${sampleData.length} rows):
${JSON.stringify(sampleData, null, 2)}

ANALYSIS GUIDELINES:
1. Base ALL answers on the actual data provided
2. When calculating statistics, show your work
3. Use markdown tables for presenting data comparisons
4. Identify patterns, trends, and anomalies
5. Provide actionable insights when relevant

RESPONSE FORMAT:
- Use clear headers (##) to organize information
- Use bullet points for lists
- Use **bold** for key metrics and findings
- Use tables when comparing multiple values
- Include specific numbers from the data

IMPORTANT:
- Never make up data that isn't in the sample
- If asked about data beyond the sample, explain you only have access to a preview
- Be precise with calculations
- Acknowledge limitations when relevant`
  }

  // Text/PDF/DOCX documents
  const contentPreview = document.content?.slice(0, 12000) || ''
  const wordCount = document.content?.split(/\s+/).length || 0
  
  return `You are AgentFlow, an expert document analyst AI assistant.

DOCUMENT CONTEXT:
- File: ${document.name}
- Type: ${document.type.toUpperCase()} Document
- Word Count: ~${wordCount.toLocaleString()}

DOCUMENT CONTENT:
${contentPreview}
${document.content && document.content.length > 12000 ? '\n\n[Document truncated for context - full document is longer]' : ''}

ANALYSIS GUIDELINES:
1. Base ALL answers on the actual document content
2. Quote relevant passages when appropriate
3. Provide structured summaries with clear sections
4. Identify key themes, arguments, and conclusions
5. Extract important facts, figures, and dates

RESPONSE FORMAT:
- Use clear headers (##) to organize information
- Use bullet points for key points
- Use **bold** for important terms and findings
- Use > blockquotes for direct quotes from the document
- Be thorough but concise

IMPORTANT:
- Only reference information that exists in the document
- If information isn't in the document, say so clearly
- Distinguish between facts stated and your interpretations
- Maintain accuracy and cite specific parts when relevant`
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body: ChatRequest = await request.json()
    const { message, document, history } = body

    if (!process.env.GROQ_API_KEY) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"content":"⚠️ **API Configuration Required**\\n\\nThe GROQ_API_KEY environment variable is not set. Please add it to your Vercel environment variables to enable AI responses.\\n\\n[Get your API key at console.groq.com](https://console.groq.com)"}\n\n'))
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

    const systemPrompt = buildSystemPrompt(document)

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
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
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '\n\n⚠️ An error occurred while generating the response.' })}\n\n`))
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
        controller.enqueue(encoder.encode('data: {"content":"⚠️ **Error**\\n\\nSomething went wrong processing your request. Please try again."}\n\n'))
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
