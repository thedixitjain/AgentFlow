import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0f] px-4 py-16 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AgentFlow
        </Link>

        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Privacy Policy</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
          Privacy, data use, and workspace ownership
        </h1>
        <p className="mt-4 text-sm text-zinc-500">Last updated: 2025</p>

        <div className="mt-10 space-y-10">
          {[
            {
              title: 'What AgentFlow stores',
              body: 'AgentFlow stores workspace sessions, uploaded documents, generated conversation history, and decision briefs so teams can return to work without losing context. No document content is shared with third parties.',
            },
            {
              title: 'How uploaded files are used',
              body: 'Uploaded documents are parsed, chunked, and embedded into a local vector index to ground answers. The content is processed entirely within your deployment—it is not used to train models or shared externally.',
            },
            {
              title: 'Workspace access',
              body: 'When Google sign-in is enabled, each account gets a separate workspace boundary. In local or demo deployments without auth, data is scoped by session and workspace headers on the server. This is appropriate for internal pilots, but not for shared public access without additional network controls.',
            },
            {
              title: 'Retention and deletion',
              body: 'Your deployment controls how long data is kept. Deletion is available through the product UI where supported, by clearing server storage, or through your database admin tools. Review these settings before going to production.',
            },
            {
              title: 'Questions',
              body: 'If you have questions about how data is handled in your specific deployment, contact the person who set up your AgentFlow instance.',
            },
          ].map((section) => (
            <section key={section.title} className="border-b border-white/[0.06] pb-10 last:border-b-0 last:pb-0">
              <h2 className="text-base font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
