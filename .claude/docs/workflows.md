# Development Workflows

## Adding a New API Endpoint

1. **Backend**: Create controller action in `Controllers/`
2. **Backend**: Add service method in `Application/Services/`
3. **Frontend**: Add endpoint to `lib/constants.ts` → `API_ENDPOINTS`
4. **Frontend**: Add service method in `services/`
5. **Frontend**: Add query key to `lib/query-keys.ts`
6. **Frontend**: Create hook using `useApiQuery` or `useApiMutation`

## Adding a CQRS Command/Query

1. Create folder `Commands/[Domain]/[Operation]/` (or `Queries/`)
2. Create command record: `XCommand.cs` implementing `IRequest<Result<T>>`
3. Create handler: `XCommandHandler.cs` implementing `IRequestHandler<TCommand, TResult>`
4. (Optional) Create validator: `XCommandValidator.cs`
5. Auto-registered via assembly scanning

## Adding User Preference (13 files)

### Backend (5 files)
1. `User.cs` - Add property with `[Column]`
2. `UserPreferencesResponse.cs` - Add response property
3. `UpdateUserPreferencesRequest.cs` - Add nullable property
4. `UserPreferencesService.cs` - Update `UpdatePreferencesAsync` + `MapToResponse`
5. `SqlUserRepository.cs` - **CRITICAL**: Copy property in `UpdateAsync`

### Frontend (4 files)
6. `types/auth.ts` - Add to both interfaces
7. `services/user-preferences.service.ts` - Add to defaults + validation
8. `store/slices/settings-slice.ts` + `store/types.ts` - State, setter, load
9. `store/bound-store.ts` - Add to `partialize` + `merge`

### Database (4 steps)
10. `dotnet ef migrations add AddXSetting`
11. Create SQL: `database/XX_new_setting.sql`
12. Mount in `docker-compose.yml`
13. Add to `Program.cs` → `ApplyAllMigrationSchemaIfMissing()`

## RAG Pipeline

```
Query → Expansion (HyDE + Multi-Query)
      → Hybrid Search (Vector + BM25 + RRF fusion)
      → LLM Reranking (relevance 0-10)
      → Context Assembly (Top-K)
      → Analytics
```

Config in `appsettings.json` → `RAG`: weights (0.7/0.3), TopK (5), threshold (0.3)

## Tauri Desktop App

```
Tauri Shell (Rust) → Frontend (WebView) → Backend (.NET sidecar) → PostgreSQL (5433)
```

Key files: `frontend/src-tauri/src/lib.rs`, `lib/tauri-bridge.ts`

```bash
bun run tauri:dev                                        # Development
bun run tauri:build:universal                            # Build
```

## API Endpoints Pattern

```typescript
export const API_ENDPOINTS = {
  NOTES: { BASE: '/notes', BY_ID: (id) => `/notes/${id}` },
  CHAT: { CONVERSATIONS: '/chat/conversations' },
  AGENT: { STREAM: (id) => `/agent/conversations/${id}/messages/stream` },
  FOCUS: { ITEMS: '/focus/items', SUGGESTIONS: '/focus/suggestions' },
};
```

## Testing

```bash
# Backend
cd backend && dotnet test

# Frontend
cd frontend && bun test

# API (curl)
API_KEY="your-key"
curl -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/notes
curl -H "Authorization: ApiKey $API_KEY" http://localhost:5001/api/health
```

## ADRs (Architecture Decision Records)

See `docs/adr/` for rationale on:
- Zustand state management (001)
- Clean Architecture (003)
- Result pattern (005)
- CQRS with MediatR (006)
- Tauri desktop app (007)
