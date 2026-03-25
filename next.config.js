/** @type {import('next').NextConfig} */
// Backend proxy is implemented in src/app/agentflow-api/[[...path]]/route.ts (reliable POST/streaming).
// Vercel: NEXT_PUBLIC_API_URL=/agentflow-api  and  BACKEND_URL=https://your-service.onrender.com
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
}
