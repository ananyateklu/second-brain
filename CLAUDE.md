# Second Brain

AI-powered knowledge management with 7 providers, smart notes, RAG search, voice agents, and focus dashboard.

## Critical Rules

**Database - Always Follow:**
- Soft delete tables: `notes`, `chat_conversations`, `focus_items`, `focus_suggestions`
  - Always filter: `WHERE is_deleted = false`
- Array columns: Use `'tag' = ANY(tags)` not `tags = 'tag'`
- UUID comparison: Cast explicitly `WHERE id = 'uuid'::uuid`

**Backend Patterns:**
- Result pattern: Handlers return `Result<T>`, controllers use `.Match(onSuccess, onFailure)`
- CQRS: Commands in `Commands/`, Queries in `Queries/`, auto-registered via MediatR

**MCP Database Access:**
- `mcp__pg__execute_sql` - Execute SQL (param: `database: "docker"` or `"desktop"`)
- `mcp__pg__search_objects` - Search schemas, tables, columns
- `mcp__pg__get_foreign_keys` - Discover table relationships

## Quick Commands

```bash
# Backend
cd backend/src/SecondBrain.API && dotnet watch run    # Dev server (port 5001)
cd backend && dotnet test                              # Run tests

# Frontend
cd frontend && bun dev            # Dev server (port 3000)
cd frontend && bun run build      # Production build
cd frontend && bun test           # Run tests
cd frontend && bun run tauri:dev  # Desktop app

# Docker
docker-compose up -d          # Start all services
```

## Architecture

| Layer | Stack |
|-------|-------|
| **Backend** | ASP.NET Core 10, PostgreSQL 18 + pgvector, MediatR (CQRS) |
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind v4, Zustand, TanStack Query |
| **Desktop** | Tauri 2.0 (Rust), embedded PostgreSQL |
| **AI** | OpenAI, Anthropic, Gemini, Grok, Ollama, Cohere |

```
backend/src/
├── SecondBrain.API/           # Controllers, Middleware
├── SecondBrain.Application/   # CQRS Commands/Queries, Services
├── SecondBrain.Core/          # Entities, Interfaces
└── SecondBrain.Infrastructure/ # Repositories, DbContext

frontend/src/
├── features/    # 16 domain modules (chat, notes, voice, focus, agents...)
├── store/       # Zustand slices (13 slices)
├── services/    # API services
└── components/  # UI components
```

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend API | 5001 |
| PostgreSQL (Docker) | 5432 |
| PostgreSQL (Desktop) | 5433 |

## Extended Documentation

Reference these with `@` when working on specific areas:

- **Backend patterns**: `@.claude/docs/backend.md`
- **Frontend patterns**: `@.claude/docs/frontend.md`
- **Database schema**: `@.claude/docs/database.md`
- **Workflows (adding features)**: `@.claude/docs/workflows.md`
- **Full schema reference**: `@database/SCHEMA_REFERENCE.md`

## Memory & Session

- `@.claude/memory.md` - User preferences, patterns, learnings
- `@.claude/session.md` - Current work focus
