import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SecurityPage() {
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

        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Security &amp; data</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
          How AgentFlow handles access, traffic, and your files
        </h1>
        <p className="mt-4 text-sm text-zinc-500">For teams evaluating AgentFlow for internal use.</p>

        <div className="mt-10 space-y-10">
          {[
            {
              title: 'Sign-in and workspace scoping',
              body: 'When Google sign-in is enabled, each person gets a separate workspace boundary enforced server-side. Without auth, the app scopes data by session and workspace headers—suitable for demos and single-team pilots, not shared public access.',
            },
            {
              title: 'Data in transit and at rest',
              body: 'Browser traffic should use HTTPS in production. Uploaded documents and chat history are stored according to your deployment: file-based storage in the default setup, or your own database and object storage when you wire them in. No document content leaves your infrastructure.',
            },
            {
              title: 'Operational safeguards',
              body: 'The API uses standard hardening patterns—rate limiting, structured logging, health checks, and metrics—so you can monitor abuse, latency, and errors the same way you would any internal service.',
            },
            {
              title: 'Before you go to production',
              body: 'For production deployments, plan for secrets management (vault or environment secrets), automated backups, retention and deletion policies, and a review of per-workspace access controls. Align the wording in this section with your organization\'s actual controls once those are finalized.',
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
