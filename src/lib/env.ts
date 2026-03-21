/**
 * Public API base URL (must be set in production Vercel: NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api)
 */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
}

/** True when the site is on a real host but env still points at localhost — API calls will fail */
export function isProductionApiLikelyMisconfigured(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const api = getPublicApiUrl()
  if (host === 'localhost' || host === '127.0.0.1') return false
  return api.includes('localhost') || api.includes('127.0.0.1')
}
