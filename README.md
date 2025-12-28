# AgentFlow

**Multi-Agent AI System for Data Analysis**

A client-side multi-agent system that routes natural language queries to specialized AI agents for structured data analysis (CSV/Excel) and document processing (PDF/TXT).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thedixitjain/AgentFlow)

---

## Architecture

```
                              ┌─────────────────────┐
                              │   USER INTERFACE    │
                              │  (Next.js + React)  │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │    ORCHESTRATOR     │
                              │  Query Classifier   │
                              │  Intent Detection   │
                              │  Agent Router       │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
         ┌──────────▼──────────┐               ┌──────────────▼──────────────┐
         │  DATA INTELLIGENCE  │               │     RESEARCH ASSISTANT      │
         │       AGENT         │               │           AGENT             │
         ├─────────────────────┤               ├─────────────────────────────┤
         │ CSV/Excel Parsing   │               │ PDF Text Extraction         │
         │ Aggregations        │               │ Extractive Summarization    │
         │ Statistical Ops     │               │ TF-IDF Keyword Extraction   │
         │ Chart Generation    │               │ Semantic Search             │
         │ Ranking/Filtering   │               │ Context-Aware Q&A           │
         └─────────────────────┘               └─────────────────────────────┘
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | Next.js 16, React 18, TypeScript, Tailwind CSS |
| Visualization | Recharts |
| Data Processing | PapaParse (CSV), SheetJS (Excel), PDF.js |
| NLP | Custom Query Classifier, Extractive Summarization, TF-IDF |
| Deployment | Vercel |

---

## Features

- **Intelligent Query Routing** — Orchestrator classifies queries and routes to appropriate agent
- **Data Analysis** — Natural language queries on tabular data with auto-generated charts
- **Document Processing** — Summarization, keyword extraction, semantic Q&A
- **Privacy-First** — All processing client-side, no data leaves browser
- **Sub-second Response** — No server round-trips

---

## Project Structure

```
src/
├── app/                     # Next.js App Router
├── components/              # React Components
│   ├── ui/                  # Reusable primitives
│   ├── ChatInterface.tsx    # Chat UI
│   ├── ChartDisplay.tsx     # Dynamic visualizations
│   └── FileUpload.tsx       # Drag & drop upload
└── lib/
    └── agents/              # AI Agent implementations
        ├── orchestrator.ts  # Query routing logic
        ├── data-agent.ts    # Data analysis
        └── research-agent.ts # Document processing
```

---

## Quick Start

```bash
git clone https://github.com/thedixitjain/AgentFlow.git
cd AgentFlow
npm install
npm run dev
```

Open `http://localhost:3000`

---

## Usage

**Data Analysis:**
```
"What is the total revenue?"
"Show average sales by category"
"Top 5 customers by sales"
```

**Document Analysis:**
```
"Summarize this document"
"Extract key topics"
"What are the main findings?"
```

---

## License

MIT

---

**Dixit Jain** — [GitHub](https://github.com/thedixitjain) · [LinkedIn](https://linkedin.com/in/thedixitjain)
