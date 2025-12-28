# AgentFlow

AI-powered document intelligence platform for modern businesses. Upload CSV, Excel, PDF, or text files and query them using natural language.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thedixitjain/AgentFlow&env=GROQ_API_KEY)

---

## Features

- **Document Analysis** — Upload and query CSV, Excel, PDF, TXT files
- **AI Chat** — General-purpose assistant for coding and analysis
- **Streaming** — Real-time token streaming responses
- **Visualizations** — Auto-generated charts from data queries
- **Voice Input** — Speech-to-text for hands-free interaction
- **Quick Insights** — Auto-generated metrics from uploaded data
- **Export** — Download conversations as Markdown

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      AGENTFLOW v2.0                        │
├────────────────────────────────────────────────────────────┤
│  Frontend          │  API Layer        │  LLM              │
│  Next.js 14        │  Edge Functions   │  Groq             │
│  React 18          │  SSE Streaming    │  Llama 3.1 70B    │
│  TypeScript        │                   │                   │
│  Tailwind CSS      │                   │                   │
└────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| LLM | Groq API (Llama 3.1 70B) |
| Charts | Recharts |
| File Parsing | PapaParse, SheetJS |
| Deployment | Vercel |

---

## Quick Start

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

---

## Deploy

1. Push to GitHub
2. Import to Vercel
3. Add `GROQ_API_KEY` environment variable
4. Deploy

---

## License

MIT

---

**Dixit Jain** — [GitHub](https://github.com/thedixitjain) · [LinkedIn](https://linkedin.com/in/thedixitjain)
