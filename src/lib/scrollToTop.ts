/** Scroll the main document to the top (landing + SPA route changes). */
export function scrollWindowToTop(): void {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}
