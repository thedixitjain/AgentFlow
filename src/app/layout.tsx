import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi-Agent AI System | Intelligent Data & Research Analysis',
  description: 'A sophisticated multi-agent AI system for data analysis and research document processing with natural language queries. Built with Next.js, TypeScript, and modern AI techniques.',
  keywords: ['AI', 'Machine Learning', 'Data Analysis', 'Research Assistant', 'Multi-Agent System', 'NLP', 'Next.js', 'TypeScript'],
  authors: [{ name: 'AI Developer' }],
  openGraph: {
    title: 'Multi-Agent AI System',
    description: 'Intelligent Data Analysis & Research Assistant Platform',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multi-Agent AI System',
    description: 'Intelligent Data Analysis & Research Assistant Platform',
  },
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
