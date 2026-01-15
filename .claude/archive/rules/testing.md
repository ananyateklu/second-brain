# Testing

## Backend Tests

Location: `backend/tests/SecondBrain.Tests.Unit/`

- Framework: xUnit, Moq
- Run: `cd backend && dotnet test`

## Frontend Tests

Location: `frontend/src/features/*/hooks/__tests__/`

- Framework: Vitest, React Testing Library, MSW
- Run: `cd frontend && bun test`

## API Testing with curl

```bash
# Test API Key (development)
API_KEY="0324230bd54c40d887957d2d5180049c"

# Get notes list
curl -s -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/notes

# Get note versions
curl -s -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/notes/{id}/versions

# Get conversations
curl -s -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/chat/conversations

# Get focus items
curl -s -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/focus/items

# Health check (no auth)
curl -s http://localhost:5001/api/health
```

## Architecture Decision Records

See `docs/adr/` for detailed rationale:

| ADR | Topic |
|-----|-------|
| 001 | Zustand for state management |
| 003 | Clean Architecture |
| 005 | Result pattern for errors |
| 006 | CQRS with MediatR |
| 007 | Tauri macOS Desktop App |
| 009 | OpenTelemetry Observability |
| 010 | HybridCache for Distributed Caching |
| 011 | Backend Performance Optimizations |

## Additional Documentation

| Document | Description |
|----------|-------------|
| `docs/RAG_TUNING_GUIDE.md` | RAG optimization strategies |
| `docs/STREAMING_REFACTOR_PLAN.md` | Streaming architecture |
| `docs/IOS_IMPORT_GUIDE.md` | iOS data import |
| `docs/FRONTEND_PERFORMANCE_GUIDE.md` | Frontend optimizations |
| `database/README.md` | Comprehensive schema docs |
| `database/POSTGRESQL_18_FEATURES.md` | Temporal tables guide |
