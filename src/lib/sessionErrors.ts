/**
 * Backend returns { error: 'Session not found' } which surfaces as Error.message.
 */
export function isSessionNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /session not found/i.test(msg.trim())
}
