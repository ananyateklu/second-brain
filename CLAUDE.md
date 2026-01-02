# Second Brain - Developer Documentation

> **Personalized Context**: See `.claude/memory.md` for user-specific preferences, patterns, and learnings
> **Session Context**: See `.claude/session.md` for current work focus
> **Auto Context**: Run `.claude/memory-cli.sh auto-context` to generate fresh context from git/files
> **Memory CLI**: Use `.claude/memory-cli.sh help` for full memory system commands
> **Git Policy**: Memory system is READ-ONLY - all commits/pushes are manual. See `.claude/GITHUB_INTEGRATION.md`

---

## Project Overview

Second Brain is an intelligent knowledge management system featuring:

- AI-powered chat with **7 providers** (OpenAI, Anthropic Claude, Google Gemini, X.AI Grok, Ollama, Cohere, SemanticKernel)
- Smart notes with version history (PostgreSQL 18 temporal tables)
- AI agents with tool execution and **9 plugins**
- Advanced RAG with hybrid search (vector + BM25 + RRF fusion)
- **Voice agents** with real-time transcription and synthesis
- **Focus/productivity dashboard** with AI task suggestions
- GitHub integration with code browser
- Multi-provider image generation (DALL-E, Gemini, Grok Aurora)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | ASP.NET Core 10, PostgreSQL 18 + pgvector, Entity Framework Core, MediatR (CQRS) |
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4 |
| **Desktop App** | Tauri 2.0 (Rust), embedded PostgreSQL |
| **State Management** | Zustand (13 slices), TanStack Query v5 |
| **AI Providers** | OpenAI, Anthropic Claude, Google Gemini, Ollama, X.AI Grok, Cohere |
| **Vector Stores** | PostgreSQL pgvector (default), Pinecone |
| **Image Generation** | OpenAI DALL-E, Google Gemini, X.AI Grok Aurora |
| **Voice I/O** | Deepgram (STT), ElevenLabs/OpenAI (TTS), Grok Realtime |
| **Resilience** | Polly (circuit breaker, retry with exponential backoff) |

---

## Architecture Overview

### Backend (Clean Architecture - 4 Layers)

```text
backend/src/
├── SecondBrain.API/           # Presentation - 16 Controllers, Middleware, DI
├── SecondBrain.Application/   # Business Logic - CQRS (200 ops), Services (221 files)
├── SecondBrain.Core/          # Domain - Entities, Interfaces, Result<T>
└── SecondBrain.Infrastructure/ # Data Access - 16 Repositories, DbContext
```

### Frontend (Feature-based)

```text
frontend/src/
├── features/      # 16 domain modules (chat, notes, voice, github, focus, agents, rag...)
├── store/         # Zustand - 13 slices, bound store
├── services/      # 13 API service files
├── lib/           # api-client, router, query-keys, tauri-bridge
├── types/         # 13 TypeScript definition files
├── hooks/         # 50+ shared React hooks
└── components/    # 200+ UI components
```

---

## Quick Start

### Backend Commands

```bash
cd backend/src/SecondBrain.API
dotnet watch run                    # Hot reload (port 5001)
cd backend && dotnet test           # Run tests
```

### Frontend Commands

```bash
cd frontend
pnpm dev                            # Dev server (port 3000)
pnpm build                          # Production build
pnpm test                           # Run tests
pnpm tauri dev                      # Desktop app
```

### Docker

```bash
docker-compose up -d                # Start all services
docker-compose logs -f              # View logs
```

---

## Detailed Documentation

All detailed documentation is organized in `.claude/rules/`:

### Backend

| File | Topics |
|------|--------|
| `.claude/rules/backend/architecture.md` | Clean Architecture, CQRS, Result pattern, Factory pattern, Repository pattern, critical files |
| `.claude/rules/backend/ai-providers.md` | Provider capabilities matrix, circuit breaker, image/embedding providers |
| `.claude/rules/backend/agents.md` | Streaming strategies, helpers (13), plugins (9), SSE events |
| `.claude/rules/backend/voice.md` | Voice system, STT/TTS providers, WebSocket streaming |

### Frontend

| File | Topics |
|------|--------|
| `.claude/rules/frontend/architecture.md` | Zustand slices, TanStack Query, SSE streaming, composite hooks, context pattern |
| `.claude/rules/frontend/components.md` | Agent streaming components, chat input composition, feature components |

### Database

| File | Topics |
|------|--------|
| `.claude/rules/database/schema.md` | 29 tables, PostgreSQL 18 features, indexes, migrations, soft delete |
| `.claude/rules/database/queries.md` | MCP tools, query patterns, common pitfalls |

### Workflows & Features

| File | Topics |
|------|--------|
| `.claude/rules/workflows.md` | Adding endpoints, CQRS commands, AI providers, user preferences (13-file checklist) |
| `.claude/rules/features.md` | RAG pipeline, Focus dashboard, GitHub integration, Insights, Temporal features, Tauri |
| `.claude/rules/configuration.md` | Environment variables, dev commands, ports, domain types |
| `.claude/rules/testing.md` | Backend/frontend testing, curl examples, ADRs |

---

## Critical Patterns

### Result Pattern (Error Handling)

```csharp
var result = await _mediator.Send(new GetNoteByIdQuery(id, userId));
return result.Match(
    onSuccess: note => Ok(note),
    onFailure: error => error.Code switch {
        "NotFound" => NotFound(error),
        _ => BadRequest(error)
    }
);
```

### Soft Delete Tables

Always filter with `WHERE is_deleted = false`:

- `notes`, `chat_conversations`, `focus_items`, `focus_suggestions`

### Database Query Pitfalls

```sql
-- WRONG: Forgetting soft delete
SELECT * FROM notes WHERE user_id = $1;

-- CORRECT
SELECT * FROM notes WHERE user_id = $1 AND is_deleted = false;

-- WRONG: Array comparison
SELECT * FROM notes WHERE tags = 'mytag';

-- CORRECT
SELECT * FROM notes WHERE 'mytag' = ANY(tags);
```

---

## Ports & Services

| Service | Port |
|---------|------|
| Frontend (dev) | 3000 |
| Backend API | 5001 |
| PostgreSQL (Docker) | 5432 |
| PostgreSQL (Desktop) | 5433 |
| Ollama | 11434 |

---

## MCP Database Access

Claude has direct PostgreSQL access via MCP tools:

- `mcp__pg-docker__execute_sql` - Execute SQL queries
- `mcp__pg-docker__search_objects` - Search schemas, tables, columns

Read `database/SCHEMA_REFERENCE.md` before writing queries.

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| `docs/RAG_TUNING_GUIDE.md` | RAG optimization strategies |
| `docs/STREAMING_REFACTOR_PLAN.md` | Streaming architecture |
| `docs/FRONTEND_PERFORMANCE_GUIDE.md` | Frontend optimizations |
| `database/README.md` | Comprehensive schema docs |
| `database/POSTGRESQL_18_FEATURES.md` | Temporal tables guide |
| `docs/adr/` | Architecture Decision Records (001-011) |
