/**
 * Display string for “which API URL” (env or default).
 * On Vercel, prefer NEXT_PUBLIC_API_URL=/agentflow-api (proxied; no CORS).
 */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
}

/** True when production site still targets localhost — API calls will fail */
export function isProductionApiLikelyMisconfigured(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const api = getPublicApiUrl()
  if (host === 'localhost' || host === '127.0.0.1') return false
  // Relative proxy path is OK
  if (api.startsWith('/')) return false
  return api.includes('localhost') || api.includes('127.0.0.1')
}
