# AgentFlow

Multi-Agent AI System for Document Intelligence

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)](https://agentflow-thedixitjain.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Overview

AgentFlow is a production-ready multi-agent AI system that intelligently routes queries to specialized agents for optimal document analysis and question answering.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Landing │  │  Chat   │  │ Sidebar │  │    Dashboard    │ │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API (Node.js)                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Orchestrator Agent                    ││
│  │         (Routes queries to specialized agents)           ││
│  └─────────────────────────────────────────────────────────┘│
│       │            │            │            │               │
│       ▼            ▼            ▼            ▼               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Ingest  │  │Question │  │Verifier │  │Summarize│        │
│  │  Agent  │  │  Agent  │  │  Agent  │  │  Agent  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      LLM Providers                           │
│     Groq (Primary)  │  OpenAI (Fallback)  │  Anthropic      │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-Agent Architecture** — Specialized agents for different tasks
- **Intelligent Routing** — Orchestrator routes queries to optimal agent
- **Document Analysis** — CSV, Excel, PDF, TXT support
- **Streaming Responses** — Real-time AI responses via SSE
- **LLM Fallback** — Automatic provider switching on failure
- **Cost Management** — Daily budget limits and tracking
- **Metrics & Monitoring** — Prometheus-compatible metrics
- **Chat History** — Persistent conversation storage

## Agents

| Agent | Purpose |
|-------|---------|
| **Orchestrator** | Routes queries, manages task queue |
| **Ingest** | Processes and analyzes documents |
| **Question** | Answers questions with context |
| **Verifier** | Validates claims and facts |
| **Summarizer** | Creates document summaries |

## Tech Stack

**Frontend**
- Next.js 14
- TypeScript
- Tailwind CSS
- React Markdown

**Backend**
- Node.js / Express
- TypeScript
- BullMQ (Task Queue)
- Redis

**AI/ML**
- Groq (Llama 3.3 70B)
- OpenAI (GPT-4)
- Anthropic (Claude 3)

**Infrastructure**
- Docker
- GitHub Actions CI/CD
- Prometheus Metrics

## Quick Start

### Frontend Only (Vercel)

```bash
npm install
npm run dev
```

### Full Stack (Docker)

```bash
# Copy environment files
cp .env.example .env.local
cp backend/.env.example backend/.env

# Add your API keys to backend/.env
# GROQ_API_KEY=your_key

# Start all services
docker-compose up -d
```

### Manual Setup

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
npm install
npm run dev
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Backend (backend/.env)
```
PORT=4000
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key (optional)
REDIS_HOST=localhost
DAILY_BUDGET=10
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session |
| POST | `/api/sessions/:id/documents` | Upload document |
| POST | `/api/sessions/:id/chat` | Send message |
| POST | `/api/sessions/:id/chat/stream` | Stream message |
| GET | `/api/agents/status` | Agent status |
| GET | `/api/stats` | System stats |
| GET | `/api/metrics` | Prometheus metrics |

## Deployment

### Vercel (Frontend)
Automatic deployment on push to main branch.

### Docker
```bash
docker-compose up -d
```

### Kubernetes
Helm charts available in `/k8s` directory.

## Monitoring

Access Prometheus metrics at `/api/metrics`:
- `agentflow_tasks_total` — Task count by type/status
- `agentflow_llm_tokens_total` — Token usage
- `agentflow_llm_cost_dollars` — Cost tracking
- `agentflow_active_agents` — Agent status

## License

MIT License — see [LICENSE](LICENSE)

## Author

**Dixit Jain**
- GitHub: [@thedixitjain](https://github.com/thedixitjain)
- LinkedIn: [/in/thedixitjain](https://linkedin.com/in/thedixitjain)
