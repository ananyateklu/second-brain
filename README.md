# Second Brain

<div align="center">

<img src="frontend/src/assets/second-brain-logo-dark-mode.png" alt="Second Brain Logo" width="180"/>

[![Backend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)](https://tauri.app/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791)](https://www.postgresql.org/)

**Intelligent knowledge management with multi-provider AI chat, smart notes, AI agents, and advanced RAG.**

</div>

---

## Quick Start

```bash
git clone https://github.com/ananyateklu/second-brain.git && cd second-brain
cp .env.example .env          # Add your AI provider API keys
docker-compose up -d          # Access at http://localhost:3000
```

---

## Screenshots

<div align="center">
<table>
<tr>
<td align="center"><img src="frontend/src/assets/dashboard-screenshot.png" alt="Dashboard" width="400"/><br>Dashboard</td>
<td align="center"><img src="frontend/src/assets/chat-screenshot.png" alt="Chat" width="400"/><br>AI Chat</td>
</tr>
<tr>
<td align="center"><img src="frontend/src/assets/aisettings-screenshot.png" alt="Settings" width="400"/><br>AI Settings</td>
<td align="center"><img src="frontend/src/assets/indexing-screenshot.png" alt="Indexing" width="400"/><br>RAG Indexing</td>
</tr>
</table>
</div>

---

## Features

### AI Chat & Agents

| Feature | Description |
|---------|-------------|
| **Multi-Provider Chat** | OpenAI, Claude, Gemini, Grok, Ollama, Cohere with streaming responses |
| **AI Agents** | Tool execution with real-time reasoning display and thinking steps |
| **Image Generation** | DALL-E, Gemini Imagen, Grok Aurora with size/quality options |
| **Vision Models** | Attach images to messages (GPT-4o, Claude 3.5, Gemini) |
| **Code Execution** | Python sandbox via Gemini with output display |
| **Web Search** | Live search (Grok), Google grounding (Gemini) |
| **Extended Thinking** | Claude reasoning chains, Grok think mode |

### Knowledge Management

| Feature | Description |
|---------|-------------|
| **Smart Notes** | Rich text editor, tags, folders, archive |
| **Version History** | Point-in-time restore via PostgreSQL 18 temporal tables |
| **AI Summaries** | Auto-generated note summaries for quick scanning |
| **Image Attachments** | Multimodal notes with AI-extracted descriptions |
| **Bulk Operations** | Multi-select delete, archive, tag |
| **iOS Sync** | Bidirectional sync via iOS Shortcuts |

### RAG Pipeline

| Stage | Features |
|-------|----------|
| **Query Expansion** | HyDE (hypothetical documents), multi-query generation |
| **Hybrid Search** | Vector (pgvector) + BM25 full-text with RRF fusion |
| **Reranking** | LLM-based relevance scoring (Cohere, OpenAI) |
| **Analytics** | Query logs, user feedback, topic clustering |
| **Vector Stores** | PostgreSQL pgvector (default), Pinecone (cloud) |

### Developer Tools

| Feature | Description |
|---------|-------------|
| **Git Integration** | Branch management, commits, diff viewer |
| **GitHub Integration** | PRs, issues, workflows, check runs |
| **Analytics Dashboard** | Token usage, provider stats, session tracking |
| **Desktop App** | Native macOS via Tauri 2.0 with embedded database |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | ASP.NET Core 10, PostgreSQL 18 + pgvector, Entity Framework Core, MediatR (CQRS) |
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, Zustand, TanStack Query v5 |
| **Desktop** | Tauri 2.0 (Rust), embedded PostgreSQL on port 5433 |
| **AI Providers** | OpenAI, Anthropic Claude, Google Gemini, X.AI Grok, Ollama, Cohere |
| **Vector Search** | PostgreSQL pgvector (HNSW), Pinecone |
| **Image Generation** | DALL-E, Gemini Imagen, Grok Aurora |
| **Resilience** | Polly circuit breaker, exponential backoff |

---

## Project Structure

```text
second-brain/
├── backend/src/
│   ├── SecondBrain.API/           # Controllers, middleware
│   ├── SecondBrain.Application/   # Services, CQRS, DTOs
│   ├── SecondBrain.Core/          # Entities, interfaces
│   └── SecondBrain.Infrastructure/ # EF Core, repositories
├── frontend/src/
│   ├── features/                  # 12 domain modules
│   ├── services/                  # API service layer
│   ├── store/                     # Zustand (12 slices)
│   └── components/                # Shared UI
├── frontend/src-tauri/            # Desktop app (Rust)
├── database/                      # 41 SQL migration scripts
└── docs/                          # ADRs, guides
```

---

## Installation

### Prerequisites

- **Docker & Docker Compose** (recommended)
- **.NET 10 SDK** (local development)
- **Node.js 20+** and **pnpm** (local development)
- **At least one AI provider API key** (OpenAI, Anthropic, Gemini, X.AI, or Ollama)

### Option 1: Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/ananyateklu/second-brain.git
cd second-brain
cp .env.example .env

# 2. Edit .env with your settings
# Required: At least one AI provider API key
# Required: JWT_SECRET_KEY (32+ characters)

# 3. Start services
docker-compose up -d

# Access: http://localhost:3000
# API: http://localhost:3000/api
```

### Option 2: Local Development

```bash
# Terminal 1: Database
docker-compose up -d postgres

# Terminal 2: Backend
cd backend/src/SecondBrain.API
cp .env.example .env  # Configure API keys
dotnet watch run      # http://localhost:5001

# Terminal 3: Frontend
cd frontend
cp .env.example .env  # Set VITE_API_URL=http://localhost:5001/api
pnpm install && pnpm dev  # http://localhost:3000
```

### Option 3: Desktop App (macOS)

```bash
# Prerequisites
brew install postgresql@18 pgvector
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build and run
./backend/publish-mac.sh
cd frontend && pnpm tauri dev
```

Data stored in `~/Library/Application Support/com.secondbrain.desktop/`

---

## Configuration

### Essential Environment Variables

```bash
# Database
POSTGRES_PASSWORD=your-secure-password

# JWT (required, 32+ characters)
JWT_SECRET_KEY=YourSuperSecretKeyAtLeast32Characters

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
XAI_API_KEY=...

# Vector Store (default: PostgreSQL)
VECTOR_STORE_PROVIDER=PostgreSQL
# Optional: Pinecone for cloud vector search
PINECONE_API_KEY=...
```

### AI Provider Settings

Configure in `appsettings.json` or environment variables:

| Provider | Default Model | Key Features |
|----------|---------------|--------------|
| OpenAI | gpt-4o-mini | Function calling, vision, structured output |
| Anthropic | claude-3-5-haiku-latest | Extended thinking, prompt caching |
| Gemini | gemini-2.0-flash | Code execution, grounding, context caching |
| X.AI | grok-3-mini | Live search, deep search, think mode |
| Ollama | qwen3:4b | Local models, no API key needed |
| Cohere | command-r-plus | Native reranking for RAG |

See `backend/src/SecondBrain.API/appsettings.json` for full configuration options.

---

## Architecture

### Web Deployment

```text
      ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
      │   React     │────▶│   nginx     │────▶│  ASP.NET    │
      │  Frontend   │     │   :3000     │     │   Core      │
      └─────────────┘     └─────────────┘     └──────┬──────┘
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          │                          │                          │
                          ▼                          ▼                          ▼
                    ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
                    │ PostgreSQL  │            │ AI Providers│            │   Pinecone  │
                    │ + pgvector  │            │ (6 total)   │            │  (optional) │
                    └─────────────┘            └─────────────┘            └─────────────┘
```

### Desktop App

```text
                    ┌────────────────────────────────────────────────────────┐
                    │                  Second Brain.app                      │
                    │  ┌──────────────────────────────────────────────────┐  │
                    │  │            Tauri Shell (Rust)                    │  │
                    │  └──────────────────────────────────────────────────┘  │
                    │                        │ IPC                           │
                    │  ┌──────────────────────────────────────────────────┐  │
                    │  │            React Frontend (WebView)              │  │
                    │  └──────────────────────────────────────────────────┘  │
                    │                        │ localhost:5001                │
                    │  ┌──────────────────────────────────────────────────┐  │
                    │  │            .NET Backend (Sidecar)                │  │
                    │  └──────────────────────────────────────────────────┘  │
                    │                        │                               │
                    │  ┌──────────────────────────────────────────────────┐  │
                    │  │         PostgreSQL (port 5433) + pgvector        │  │
                    │  └──────────────────────────────────────────────────┘  │
                    └────────────────────────────────────────────────────────┘
```

---

## API Reference

Full API documentation available at `/swagger` when running the backend.

### Key Endpoints

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/api/auth` | Login, register, API keys |
| Notes | `/api/notes` | CRUD, versions, summaries, images |
| Chat | `/api/chat` | Conversations, streaming (SSE), image generation |
| Agents | `/api/agent` | Agent streaming with tool execution |
| RAG | `/api/rag/analytics` | Query logs, feedback, topic clustering |
| Indexing | `/api/indexing` | Vector indexing jobs and stats |
| Git | `/api/git` | Repository operations, branches |
| GitHub | `/api/github` | PRs, issues, workflows |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Database connection fails** | Verify PostgreSQL is running: `docker-compose ps` |
| **AI provider errors** | Check API key is set and provider is enabled in settings |
| **Vector search not working** | Run indexing: `POST /api/indexing/start` |
| **JWT authentication fails** | Ensure `JWT_SECRET_KEY` is 32+ characters |
| **CORS errors** | Add frontend URL to `CORS_ALLOWED_ORIGINS` |
| **Desktop app won't start** | Check PostgreSQL 18 is installed: `brew info postgresql@18` |

### Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend (local) | 5001 |
| PostgreSQL (Docker) | 5432 |
| PostgreSQL (Desktop) | 5433 |
| Ollama | 11434 |

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Developer documentation and patterns |
| [RAG Tuning Guide](docs/RAG_TUNING_GUIDE.md) | Optimize RAG performance |
| [iOS Sync Guide](docs/ios-notes-sync-guide.md) | Set up iPhone/iPad sync |
| [Database README](database/README.md) | Schema documentation |
| [ADRs](docs/adr/) | Architecture decision records |

### Architecture Decisions

- [ADR 001](docs/adr/001-zustand-for-client-state.md) - Zustand for state management
- [ADR 006](docs/adr/006-cqrs-mediatr-pattern.md) - CQRS with MediatR
- [ADR 007](docs/adr/007-tauri-macos-desktop-app.md) - Tauri desktop app
- [ADR 014](docs/adr/014-agent-streaming-strategy-pattern.md) - Agent streaming strategies

---

## Development

### Running Tests

```bash
# Backend
cd backend && dotnet test

# Frontend
cd frontend && pnpm test
```

### Creating Migrations

```bash
# EF Core migration
cd backend/src/SecondBrain.API
dotnet ef migrations add MigrationName

# Check migration status
./database/migrate.sh status
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
