import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AgentFlow | AI Document Intelligence',
  description: 'Transform your documents into actionable insights with AI-powered analysis. Built for modern businesses.',
  keywords: ['AI', 'document analysis', 'data intelligence', 'LLM', 'business analytics'],
  authors: [{ name: 'Dixit Jain' }],
  openGraph: {
    title: 'AgentFlow | AI Document Intelligence',
    description: 'Transform your documents into actionable insights with AI-powered analysis.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
