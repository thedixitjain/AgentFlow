export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0f] px-4 py-16 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Security &amp; data</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
          How AgentFlow handles access, traffic, and your files
        </h1>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-300">
          <section>
            <h2 className="text-lg font-semibold text-white">Sign-in and workspaces</h2>
            <p className="mt-2">
              When Google sign-in is enabled, each person gets a separate workspace boundary. Without it, the app still scopes data by session and workspace headers on the server, suitable for demos and single-team pilots, not shared public kiosks.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Data in transit and at rest</h2>
            <p className="mt-2">
              Browser traffic should use HTTPS in production. Uploaded documents and chat history are stored according to your deployment: file-based storage in the default setup, or your own database and object storage when you wire them in.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Operational safeguards</h2>
            <p className="mt-2">
              The API uses standard hardening patterns (rate limiting, structured logging, health checks, and metrics) so you can monitor abuse, latency, and errors the same way you would any other internal service.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Before you go live</h2>
            <p className="mt-2">
              For production, plan for secrets in a vault, backups, retention and deletion policies, and a review of who can access which workspace. We’re happy to align wording here with your org’s actual controls once those are fixed.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
