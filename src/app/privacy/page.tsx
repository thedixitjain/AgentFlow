export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0c0c0f] px-4 py-16 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Privacy Policy</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white">
          Privacy, data use, and workspace ownership
        </h1>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-300">
          <section>
            <h2 className="text-lg font-semibold text-white">What AgentFlow stores</h2>
            <p className="mt-2">
              AgentFlow stores workspace sessions, uploaded documents, generated conversation history, and decision briefs so teams can return to work without losing context.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">How uploaded files are used</h2>
            <p className="mt-2">
              Uploaded documents are processed to ground answers, create summaries, and generate business-ready outputs such as risks, actions, and follow-up questions.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Workspace access</h2>
            <p className="mt-2">
              With Google sign-in turned on, workspaces are separated per account. In local or demo setups without auth, treat the app as single-user: anyone with the URL could reach the same backend unless you add network or identity controls.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Retention and deletion</h2>
            <p className="mt-2">
              Your deployment chooses how long data is kept and how deletion works: via the product UI where supported, by clearing server storage, or through your database admin tools. Document those choices for your own users and regulators.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
