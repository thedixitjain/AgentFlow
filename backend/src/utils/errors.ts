export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const message = error instanceof Error ? error.message.trim() : String(error || '').trim()

  if (!message) {
    return fallback
  }

  if (/no llm providers configured/i.test(message)) {
    return `${message} Add a provider API key to the backend environment and restart the service.`
  }

  if (/not configured/i.test(message) && /(groq|gemini|openai)/i.test(message)) {
    return `${message}. Check your backend API key configuration and restart the service.`
  }

  return message.length <= 400 ? message : fallback
}

export function getErrorStatus(error: unknown): number {
  const message = getErrorMessage(error, '')

  if (
    /no llm providers configured/i.test(message) ||
    (/not configured/i.test(message) && /(groq|gemini|openai)/i.test(message))
  ) {
    return 503
  }

  return 500
}
