# Resume Bullets

## Short Version

- Built a multi-agent business-document copilot using Next.js, Express, Groq, and retrieval-augmented generation for grounded Q&A over sales, finance, and operations documents.
- Added persistent backend storage for sessions, documents, and vector chunks, replacing browser-only state with a reusable backend architecture.
- Implemented evaluation pipelines and telemetry for route selection, retrieval quality, latency, token usage, and provider cost tracking.
- Added workspace-scoped session isolation, safer log redaction, and prompt-injection-aware retrieval prompts to improve operational safety.

## Stronger Technical Version

- Engineered a multi-agent RAG system with orchestrator, ingest, question, verifier, summarizer, and retrieval agents for document intelligence workflows.
- Refactored the app from client-local chat state to persistent backend-managed sessions and vector storage, enabling repeatable demos and measurable system behavior.
- Built a backend eval harness with persisted run history and benchmark suites for document QA, capturing per-case score, retrieval latency, generation latency, and token usage.
- Instrumented the platform with telemetry and Prometheus metrics for routing decisions, provider usage, retrieval quality, queue state, and cost-aware LLM operations.
- Introduced workspace-scoped access controls and log sanitization to reduce cross-session leakage risk and secret exposure in local operations.

## Product-Focused Version

- Built an AI copilot for sales and operations documents that can summarize reports, answer grounded business questions, and surface evidence-backed insights.
- Added persistent chat history, retrieval telemetry, and evaluation reporting so the system could be demoed as a credible applied AI product instead of a toy chatbot.
- Designed a system insights panel showing runtime health, provider usage, retrieval quality, and eval outcomes for easier demos to recruiters and hiring managers.
