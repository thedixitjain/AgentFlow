# 🚀 AgentFlow

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=for-the-badge&logo=vercel)

**Multi-Agent AI System for Data Analysis**

[Live Demo](https://agentflow.vercel.app) • [Documentation](#-documentation) • [Getting Started](#-getting-started)

</div>

---

## 📋 Overview

AgentFlow is a sophisticated **multi-agent AI system** that processes structured business data (CSV/Excel) and unstructured research documents (PDF/TXT) through natural language queries. The system intelligently routes queries to specialized AI agents for optimal results.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **Intelligent Query Routing** | Orchestrator automatically classifies and routes queries to specialist agents |
| 📊 **Data Intelligence Agent** | Natural language queries on CSV/Excel with auto-generated visualizations |
| 📄 **Research Assistant Agent** | PDF/TXT summarization, keyword extraction, and semantic Q&A |
| 📈 **Dynamic Visualizations** | Bar, line, and pie charts generated based on query context |
| 🔒 **Privacy-First Design** | All processing happens client-side - data never leaves your browser |
| ⚡ **Real-Time Results** | Sub-second response times with no server round-trips |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENTFLOW                                       │
│                    (Next.js 16 + React + TypeScript)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   File Upload   │    │  Chat Interface │    │  Visualization  │         │
│  │   (CSV/PDF)     │    │   (NL Queries)  │    │   (Recharts)    │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  ▼                                          │
│                    ┌─────────────────────────┐                              │
│                    │   ORCHESTRATOR AGENT    │                              │
│                    │  ┌───────────────────┐  │                              │
│                    │  │ Query Classifier  │  │                              │
│                    │  │ Intent Detection  │  │                              │
│                    │  │ Agent Router      │  │                              │
│                    │  └───────────────────┘  │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                           │
│              ┌──────────────────┴──────────────────┐                        │
│              ▼                                     ▼                        │
│   ┌─────────────────────┐           ┌─────────────────────┐                │
│   │  DATA INTELLIGENCE  │           │ RESEARCH ASSISTANT  │                │
│   │       AGENT         │           │       AGENT         │                │
│   ├─────────────────────┤           ├─────────────────────┤                │
│   │ • CSV/Excel Parsing │           │ • PDF Text Extract  │                │
│   │ • Aggregations      │           │ • Extractive Summary│                │
│   │ • Statistical Ops   │           │ • TF-IDF Keywords   │                │
│   │ • Chart Generation  │           │ • Semantic Search   │                │
│   │ • Ranking/Filtering │           │ • Context Q&A       │                │
│   └─────────────────────┘           └─────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Capabilities

| Agent | Role | Key Functions |
|-------|------|---------------|
| **Orchestrator** | Central Coordinator | Query classification, intent recognition, intelligent routing |
| **Data Intelligence** | Structured Data Analysis | Aggregations (sum/avg/min/max), visualizations, rankings, filtering |
| **Research Assistant** | Document Processing | Extractive summarization, TF-IDF keyword extraction, semantic Q&A |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 18, TypeScript 5, Tailwind CSS |
| **Visualization** | Recharts, Framer Motion |
| **Data Processing** | PapaParse (CSV), SheetJS (Excel), PDF.js |
| **AI/NLP** | Custom Query Classifier, Extractive Summarization, TF-IDF |
| **Deployment** | Vercel (Edge-optimized) |

---

## 📁 Project Structure

```
agentflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main application
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React Components
│   │   ├── ui/                 # Reusable UI primitives
│   │   ├── Header.tsx          # App header
│   │   ├── Sidebar.tsx         # File management
│   │   ├── ChatInterface.tsx   # Chat UI
│   │   ├── ChartDisplay.tsx    # Dynamic charts
│   │   └── FileUpload.tsx      # Drag & drop upload
│   │
│   └── lib/                    # Core Logic
│       ├── agents/             # AI Agent implementations
│       │   ├── orchestrator.ts # Query routing
│       │   ├── data-agent.ts   # Data analysis
│       │   └── research-agent.ts # Document processing
│       └── utils.ts            # Utilities
│
├── sample_data/                # Demo datasets
└── public/                     # Static assets
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/thedixitjain/AgentFlow.git
cd AgentFlow

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

---

## ☁️ Deployment

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thedixitjain/AgentFlow)

### Manual Deploy

```bash
npm i -g vercel
vercel
```

---

## 📖 Usage Examples

### Data Analysis Queries
```
"What is the total revenue?"
"Show average sales by category"
"Plot revenue by product"
"Top 5 customers by sales"
"What's the maximum order value?"
```

### Document Analysis Queries
```
"Summarize this document"
"Extract key topics"
"What methodology was used?"
"What are the main findings?"
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Your Name**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/yourprofile)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/thedixitjain)

---

<div align="center">

**Built with Next.js, TypeScript, and Multi-Agent AI Architecture**

</div>
