# AgentFlow

AI-powered document intelligence. Upload files, ask questions, get instant answers.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thedixitjain/AgentFlow&env=GROQ_API_KEY)

## Features

- **Document Analysis** — CSV, Excel, PDF, TXT support
- **Natural Language Queries** — Ask questions in plain English
- **AI Chat** — General assistant when no document is loaded
- **Instant Responses** — Powered by Llama 3.1 70B via Groq

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Groq API (Llama 3.1 70B)

## Setup

```bash
git clone https://github.com/thedixitjain/AgentFlow.git
cd AgentFlow
npm install
```

Create `.env.local`:
```
GROQ_API_KEY=your_api_key
```

```bash
npm run dev
```

## Deploy

Push to GitHub, import to Vercel, add `GROQ_API_KEY` environment variable.

## License

MIT

---

**Dixit Jain** — [GitHub](https://github.com/thedixitjain) · [LinkedIn](https://linkedin.com/in/thedixitjain)
