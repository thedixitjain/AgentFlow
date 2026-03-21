/** @type {import('next').NextConfig} */
// Proxy backend through this Next app so the browser never cross-origin calls Render (fixes CORS).
// Vercel: set NEXT_PUBLIC_API_URL=/agentflow-api
// Optional: BACKEND_URL=https://your-service.onrender.com (defaults below for this project’s Render URL)
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://agentflow-fg2n.onrender.com'

const nextConfig = {
  async rewrites() {
    const base = backendUrl.replace(/\/$/, '')
    return [
      {
        source: '/agentflow-api/:path*',
        destination: `${base}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
