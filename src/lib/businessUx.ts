import type { DocumentFile } from './types'
import type { EvalRun, SystemStats } from './api'

const UUID_PATTERN =
  /[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi
const LONG_HEX_PATTERN = /[a-f0-9]{24,}/gi
const TECHNICAL_TOKEN_PATTERN = /\b(?:workspace|session|chat|doc|document)[-_ ]+[a-z0-9]{6,}\b/gi
const CONNECTION_ERROR_PATTERN =
  /(failed to fetch|network ?error|load failed|timeout|gateway|econn|api[_ -]?key|provider|groq|openai|gemini)/i
const TECHNICAL_ERROR_PATTERN =
  /(cors|next_public_|http \d+|syntaxerror|unexpected token|enoent|stack trace)/i

export const CHAT_CONNECTION_ERROR_MESSAGE =
  "I'm having trouble connecting to the server. Please try again in a moment."

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripTechnicalTokens(value: string): string {
  return collapseWhitespace(
    value
      .replace(UUID_PATTERN, ' ')
      .replace(LONG_HEX_PATTERN, ' ')
      .replace(TECHNICAL_TOKEN_PATTERN, ' ')
      .replace(/^[._\s-]+|[._\s-]+$/g, '')
      .replace(/\s+([.)\]-])/g, '$1')
      .replace(/([([{-])\s+/g, '$1'),
  )
}

function looksTechnicalError(message: string): boolean {
  return TECHNICAL_ERROR_PATTERN.test(message)
}

export function normalizeChatInput(input: string, isLoading: boolean): string | null {
  const trimmed = input.trim()

  if (!trimmed || isLoading) {
    return null
  }

  return trimmed
}

export function toReadableConversationTitle(
  value: string | null | undefined,
  fallback = 'Untitled workspace',
): string {
  const candidate = stripTechnicalTokens(value || '')

  if (!candidate || /^(workspace|session|chat)$/i.test(candidate)) {
    return fallback
  }

  return candidate
}

export function toReadableDocumentName(
  value: string | null | undefined,
  fallback = 'Untitled document',
): string {
  const candidate = (value || '').trim()
  if (!candidate) {
    return fallback
  }

  const extensionMatch = candidate.match(/(\.[a-z0-9]{1,5})$/i)
  const extension = extensionMatch?.[1]?.toLowerCase() || ''
  const baseName = extension ? candidate.slice(0, -extension.length) : candidate
  const cleanedBase = stripTechnicalTokens(baseName).replace(/[_]+/g, ' ')

  if (!cleanedBase || /^(document|doc|file)$/i.test(cleanedBase)) {
    return `${fallback}${extension}`
  }

  return `${collapseWhitespace(cleanedBase)}${extension}`
}

export function toUserFacingAppError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message = error instanceof Error ? error.message.trim() : String(error || '').trim()

  if (!message) {
    return fallback
  }

  if (/session not found/i.test(message)) {
    return 'This conversation is no longer available. Please start a new workspace and try again.'
  }

  if (/document not found/i.test(message)) {
    return 'That document is no longer available. Please upload it again.'
  }

  if (CONNECTION_ERROR_PATTERN.test(message)) {
    return CHAT_CONNECTION_ERROR_MESSAGE
  }

  if (looksTechnicalError(message)) {
    return fallback
  }

  return message.length <= 180 ? message : fallback
}

export async function getUploadErrorMessage(
  response: Pick<Response, 'text'> | null,
  fallback: string,
): Promise<string> {
  if (!response) {
    return fallback
  }

  const text = await response.text().catch(() => '')
  if (!text) {
    return fallback
  }

  try {
    const parsed = JSON.parse(text) as { error?: string }
    if (parsed.error) {
      const friendlyMessage = toUserFacingAppError(parsed.error, fallback)
      return friendlyMessage === CHAT_CONNECTION_ERROR_MESSAGE ? fallback : friendlyMessage
    }
  } catch {
    // Ignore invalid JSON and fall back to the raw response text below.
  }

  const friendlyMessage = toUserFacingAppError(text, fallback)
  return friendlyMessage === CHAT_CONNECTION_ERROR_MESSAGE ? fallback : friendlyMessage
}

export function buildParsedTextDocument(
  file: Pick<DocumentFile, 'name' | 'size'>,
  type: Extract<DocumentFile['type'], 'pdf' | 'docx'>,
  text: string | null | undefined,
  uploadedAt: Date = new Date(),
): DocumentFile {
  return {
    name: file.name,
    type,
    size: file.size,
    content: text?.trim() || `${type.toUpperCase()} content could not be extracted.`,
    uploadedAt,
  }
}

export function getSimpleSystemSummary(stats: SystemStats | null, recentEval: EvalRun | null): {
  statusLabel: string
  statusTone: 'good' | 'warning'
  documentsIndexed: number
  monthlyCost: string
  guidance: string
} {
  if (!stats) {
    return {
      statusLabel: 'Connecting',
      statusTone: 'warning',
      documentsIndexed: 0,
      monthlyCost: '$0.00',
      guidance: 'AgentFlow is waiting for the latest workspace health snapshot.',
    }
  }

  const needsReview = Boolean(recentEval && recentEval.averageScore < 0.65)

  return {
    statusLabel: needsReview ? 'Needs review' : 'Active',
    statusTone: needsReview ? 'warning' : 'good',
    documentsIndexed: stats.rag.totalDocuments,
    monthlyCost: `$${stats.budget.used.toFixed(2)}`,
    guidance: needsReview
      ? 'Recent checks suggest the workspace should be reviewed before sharing widely.'
      : 'Core services are available and your indexed documents are ready to use.',
  }
}
