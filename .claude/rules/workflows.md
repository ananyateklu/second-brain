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
2. Create command/query record: `XCommand.cs` implementing `IRequest<Result<T>>`
3. Create handler: `XCommandHandler.cs` implementing `IRequestHandler<TCommand, TResult>`
4. (Optional) Create validator: `XCommandValidator.cs` extending `AbstractValidator<T>`
5. Auto-registered via assembly scanning

## Adding an AI Provider

1. Create provider class implementing `IAIProvider` in `Services/AI/Providers/`
2. Register in `ServiceCollectionExtensions.cs`
3. Add config to `appsettings.json` → `AIProviders` section
4. Update `AIProviderFactory` to recognize provider name

## Adding User Preference (13-file checklist)

### Backend (5 files)

1. `User.cs` - Add property with `[Column]` attribute
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

10. Create EF migration: `dotnet ef migrations add AddXSetting`
11. Create SQL script: `database/XX_new_setting.sql`
12. Mount in `docker-compose.yml`
13. Add to `Program.cs` → `ApplyAllMigrationSchemaIfMissing()`

## API Endpoints Pattern

```typescript
// lib/constants.ts
export const API_ENDPOINTS = {
  NOTES: { BASE: '/notes', BY_ID: (id) => `/notes/${id}`, VERSIONS: (id) => `/notes/${id}/versions` },
  CHAT: { CONVERSATIONS: '/chat/conversations', STREAM: (id) => `/chat/.../stream` },
  AGENT: { STREAM: (id) => `/agent/conversations/${id}/messages/stream`, CAPABILITIES: '/agent/capabilities' },
  VOICE: { SESSIONS: '/voice/sessions', STREAM: (id) => `/voice/sessions/${id}/stream` },
  FOCUS: { ITEMS: '/focus/items', SUGGESTIONS: '/focus/suggestions' },
  RAG_ANALYTICS: { FEEDBACK: '/rag/analytics/feedback', STATS: '/rag/analytics/stats' },
};
```

## Git & GitHub Integration

### Git Service (`Services/Git/`)

```csharp
var branches = await _gitService.GetBranchesAsync(repoPath, userId);
await _gitService.CreateBranchAsync(repoPath, branchName, fromBranch);
await _gitService.CheckoutBranchAsync(repoPath, branchName);
var commits = await _gitService.GetCommitHistoryAsync(repoPath, branchName);
```

### GitHub Service (`Services/GitHub/`)

```csharp
var repos = await _gitHubService.GetUserRepositoriesAsync(userId);
var prs = await _gitHubService.GetPullRequestsAsync(owner, repo, state: "open");
var issues = await _gitHubService.GetIssuesAsync(owner, repo);
var runs = await _gitHubService.GetWorkflowRunsAsync(owner, repo);
```
