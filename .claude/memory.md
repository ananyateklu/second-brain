# User Memory - Second Brain Project

> **Purpose**: Long-term developer preferences, project quirks, and learned patterns.
> **Last Updated**: 2025-12-18 (xAI Grok Voice Agent Integration complete)
> **Developer**: Ananya Teklu

---

## Developer Preferences

### Code Style

- **Components**: Functional components with hooks (no class components)
- **Functions**: Arrow functions for all methods
- **TypeScript**: Strict mode, explicit return types for public APIs
- **Imports**: Absolute imports with `@/` prefix
- **Composition**: Prefer composition over inheritance

### Backend Preferences

- **Error Handling**: Always use `Result<T>` pattern for service methods
- **CQRS**: Commands for writes, Queries for reads (MediatR)
- **Validation**: FluentValidation for all request DTOs
- **Logging**: Structured logging with context (Serilog)
- **Testing**: xUnit with Moq for mocking

### Frontend Preferences

- **State**: Zustand selectors for all state access (no direct store usage)
- **Queries**: TanStack Query for server state (no direct fetch in components)
- **Hooks**: Composite hooks for complex page state
- **Testing**: Vitest + React Testing Library + MSW for API mocking
- **Coverage**: Target 90%+ (currently 91.08% with 3,211 tests)

### Git & Commits

- **Commit Style**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- **Branch Naming**: `feature/description`, `fix/description`, `refactor/description`
- **PR Size**: Max 400 lines changed (break into smaller PRs)
- **Reviews**: Always run tests before requesting review

---

## Project-Specific Knowledge

### Database Quirks

- **Ports**: Desktop PostgreSQL uses port 5433, Docker uses 5432
- **Migrations**: Always run `./database/migrate.sh status` after pulling
- **Vector Search**: Manual VACUUM needed on `note_embeddings` for >10k notes
- **Temporal Tables**: PostgreSQL 18 features require `system_time` column access
- **Soft Deletes**: Global query filter active - use `IgnoreQueryFilters()` if needed

### Environment Setup

- **OS**: macOS Sonoma (M1/M2 architecture)
- **Node**: v20.x (via nvm)
- **.NET**: SDK 10.0
- **PostgreSQL**: 18 via Homebrew (installed at `/opt/homebrew/opt/postgresql@18`)
- **Ollama**: Running locally on port 11434, models in `~/.ollama/models/`

### API Keys & Secrets

- **Storage**: 1Password vault "Second Brain Dev"
- **Local .env**: Never commit (in .gitignore)
- **Desktop App**: Secrets stored via Tauri secure storage (keychain)
- **CI/CD**: GitHub Actions secrets for deployment

### Development Workflow

1. Pull latest from `main`
2. Run `./database/migrate.sh status` to check schema
3. Run `dotnet restore` and `pnpm install`
4. Start Docker: `docker-compose up -d`
5. Start backend: `cd backend/src/SecondBrain.API && dotnet watch run`
6. Start frontend: `cd frontend && pnpm dev`
7. Run tests before committing: `dotnet test && pnpm test`

---

## Custom Patterns & Conventions

### Backend Patterns

#### Service Method Signature

```csharp
// Always return Result<T> for expected failures
public async Task<Result<NoteResponse>> CreateNoteAsync(
    CreateNoteRequest request,
    CancellationToken cancellationToken = default)
{
    // Validate
    // Process
    // Return Result<T>
}
```

#### CQRS Handler Pattern

```csharp
// Commands in Commands/[Domain]/[Operation]/
public record CreateNoteCommand(...) : IRequest<Result<NoteResponse>>;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    // Inject dependencies
    // Handle logic
    // Return Result
}
```

#### Circuit Breaker Usage

```csharp
// Wrap all external AI provider calls
var result = await _circuitBreaker.ExecuteAsync(
    "OpenAI",
    async ct => await _openAIClient.ChatCompletionAsync(...),
    cancellationToken
);
```

### Frontend Patterns

#### Zustand Selector Pattern

```typescript
// ALWAYS use selectors - never access store directly
// ✅ Good
const user = useBoundStore(state => state.user);

// ❌ Bad
const { user } = useBoundStore();
```

#### TanStack Query Pattern

```typescript
// Use query-keys.ts factories
const { data: note } = useQuery({
  queryKey: noteKeys.detail(noteId),
  queryFn: () => notesService.getById(noteId),
  enabled: !!noteId,
});
```

#### Composite Hook Pattern

```typescript
// For complex pages, create composite hooks
export function useChatPageState() {
  const sendMessage = useSendMessage();
  const conversations = useChatConversations();
  const settings = useChatSettings();

  return { sendMessage, conversations, settings };
}
```

---

## Common Gotchas & Solutions

### Backend Issues

#### Issue: EF Core not saving changes

**Cause**: Repository doesn't copy properties to tracked entity in `UpdateAsync`
**Solution**: Always copy all properties in `SqlUserRepository.UpdateAsync()`

#### Issue: Circuit breaker stuck open

**Cause**: Too many failures to AI provider
**Solution**: Check provider health, restart circuit via `GET /health/circuit-breaker/{provider}/reset`

#### Issue: Migrations out of sync

**Cause**: Docker vs Desktop using different schema sources
**Solution**: Run `./database/migrate.sh diff` to compare, then `sync-to-docker` or `sync-to-desktop`

### Frontend Issues

#### Issue: State not persisting to localStorage

**Cause**: Missing property in `partialize` or `merge` functions
**Solution**: Update `bound-store.ts` with new state property

#### Issue: Store hydration error on load

**Cause**: Corrupted localStorage with invalid field values (post-cleanup)
**Solution**: Clear localStorage in browser DevTools → Application → Clear site data

#### Issue: Draft saving fails

**Cause**: IndexedDB not available (private browsing mode)
**Solution**: Use regular browsing mode or handle the thrown error in UI

#### Issue: Query not refetching

**Cause**: Query key not invalidated after mutation
**Solution**: Call `queryClient.invalidateQueries({ queryKey: noteKeys.all })`

#### Issue: "useUIStore/useThemeStore/useAuthStore is not defined"

**Cause**: Old import from deleted deprecated store proxies (removed Dec 2025)
**Solution**: Import from `useBoundStore` instead: `import { useBoundStore } from '../store/bound-store'`

#### Issue: Test mock type mismatches after interface changes

**Cause**: Mock objects in tests don't match updated TypeScript interfaces
**Solution**: Update mock helpers (e.g., `createMockVersion`, `createMockPaginatedResponse`) to include all required properties. Use `as unknown as Type` for complex partial mocks.

#### Issue: GitHub API rate limit exceeded

**Cause**: Too many requests to GitHub API (5,000/hour for authenticated)
**Solution**: Use aggressive TanStack Query caching (5-10 min staleTime), fetch full tree recursively once instead of multiple content calls

#### Issue: GitHub file contents not displaying

**Cause**: Content comes base64-encoded, binary files, or files >1MB
**Solution**: Backend decodes base64 to UTF-8, detect binary by extension, show warning for large files

### Voice Agent Issues

#### Issue: ElevenLabs audio stops mid-sentence

**Cause**: `isFinal.GetBoolean()` crashes when ElevenLabs sends `"isFinal": null`
**Solution**: Use `isFinal.ValueKind == JsonValueKind.True` instead of `GetBoolean()`

#### Issue: TTS skips words or sounds choppy

**Cause**: Text sent in too-small chunks (triggered on comma, 100-char limit mid-word)
**Solution**: Send on sentence-end punctuation only, use 150-250 char buffers at word boundaries, set `try_trigger_generation = true` only on sentence ends

#### Issue: WebSocket reconnection spam after stopping session

**Cause**: Backend closes connection before frontend's `close(1000)` is processed
**Solution**: Add `intentionalDisconnect` flag, set before closing, check in `handleClose`

#### Issue: TTS mispronounces numbers, abbreviations, symbols

**Cause**: LLM outputs "123", "Dr.", "$50" which TTS reads literally
**Solution**: System prompt must explicitly instruct: write numbers as words, expand abbreviations, spell out symbols

#### Issue: TTS session times out during long tool execution

**Cause**: ElevenLabs has ~20 second input timeout. RAG pipeline or tool execution can take 15-22 seconds. TTS session initialized for tool announcement times out before response tokens arrive.
**Solution**: Implement auto-reconnection in `EnsureSynthesisSessionAsync()` - check `IsConnected`, dispose old session, create new one. Also track `isInsideThinking` to defer TTS init during thinking blocks.

#### Issue: TTS buffer cleared on every token after thinking ends

**Cause**: Checking `currentBuffer.Contains("</thinking>")` on accumulated buffer - always true after thinking ends, clears `ttsBuffer` on every subsequent token
**Solution**: Use `hasExitedThinking` flag to clear buffer only ONCE when first detecting `</thinking>`, check only `tokenContent` (current token) not accumulated buffer

#### Issue: Race condition in TTS session initialization

**Cause**: Multiple tokens arriving during async `CreateSessionAsync()` can bypass the `if (!initialized)` check
**Solution**: Use `SemaphoreSlim(1, 1)` with double-checked locking pattern - check before lock, acquire lock, check again after lock

#### Issue: ObjectDisposedException on session cleanup

**Cause**: Transcription/TTS callbacks arrive after orchestrator is disposed, trying to access disposed `SemaphoreSlim`
**Solution**: Add `_disposed` flag, check it BEFORE attempting `WaitAsync()` on semaphore. Set flag in `DisposeAsync()` before disposing the semaphore.

#### Issue: Voice agent responds too quickly / interrupts user

**Cause**: `EndpointingMs` and `SilenceTimeoutMs` set too low (default 1500ms)
**Solution**: Increase to 2500ms for more patient listening. Values in `appsettings.json` override code defaults.

### Grok Voice Agent Issues

#### Issue: xAI Grok Voice built-in tools not working

**Cause**: Built-in tools (`web_search`, `x_search`) defined with extra fields (`Name`, `Description`, `Parameters`) that are only for custom function tools
**Solution**: For xAI built-in tools, only specify `Type` field:
```csharp
public static GrokRealtimeTool WebSearch() => new()
{
    Type = "web_search"
    // Note: Built-in tools don't need name, description, or parameters
};
```

#### Issue: Grok Voice audio plays back deep/slow

**Cause**: Sample rate mismatch - frontend AudioPlayer defaulting to 16kHz but Grok sends 24kHz audio
**Solution**: Backend sends `sampleRate` with audio chunks (24000 for Grok), frontend AudioPlayer creates AudioBuffer with source sample rate

#### Issue: Grok Voice stops hearing after first response

**Cause**: React stale closure - `onAudioData` callback captured initial `isMicrophoneEnabled` and `isAudioPlaying` state values
**Solution**: Use refs (`isMicrophoneEnabledRef`, `isAudioPlayingRef`) and access `ref.current` in callbacks instead of captured state

#### Issue: Grok Voice tool indicator shows "running" indefinitely

**Cause**: Backend only sent `grounding_sources` event, not `tool_call_start` / `tool_call_end` events that frontend expects
**Solution**: Update `HandleFunctionCallDoneAsync` to emit all three events: `tool_call_start`, `grounding_sources`, `tool_call_end`

#### Issue: Grok Voice VoiceProviderType validation error

**Cause**: Enum serialization mismatch between frontend (`'grok_voice'`) and backend (`'GrokVoice'`)
**Solution**: Align enum values and use `JsonStringEnumConverter` with `JsonNamingPolicy.CamelCase` on backend

#### Issue: Grok Voice custom app functions not available

**Cause**: `VoiceAgentInterface.tsx` hardcoded `agentEnabled: false` and `capabilities: []` for Grok Voice mode
**Solution**: Pass actual `agentEnabled` and `capabilities` from Zustand store to backend session options

#### Issue: Grok Voice custom function tools not executing

**Cause**: Unlike built-in tools (executed by xAI), custom function tools must be executed locally and results sent back
**Solution**: In `HandleFunctionCallDoneAsync`:
1. Execute tool via `IToolExecutor`
2. Send result back via `conversation.item.create` with `type: "function_call_output"`
3. Trigger `response.create` to continue conversation

### Testing Issues

#### Issue: Integration tests fail with "function does not exist" error

**Cause**: `WebApplicationFactoryFixture.ApplyVersioningSchema()` stored procedure out of sync with production
**Solution**: Update test fixture to match `database/*.sql` schema (check parameter counts, column types)

#### Issue: CI integration tests fail with "duplicate key" errors

**Cause**: Multiple test instances run concurrently against shared PostgreSQL, causing race conditions on `CREATE EXTENSION` and user seeding
**Solution**: Wrap idempotent operations in try-catch for PostgreSQL error codes 23505 (unique_violation) and 42701 (duplicate_column)

---

## Performance Optimizations

### Database Performance

- Use `EXPLAIN ANALYZE` for slow queries (>100ms)
- Batch inserts for >10 notes (use `COPY` command)
- Index foreign keys and frequently filtered columns
- Run `VACUUM ANALYZE` weekly on `note_embeddings`

### Backend Performance

- Cache embeddings (already implemented via `CachedEmbeddingProvider`)
- Use `AsNoTracking()` for read-only queries
- Enable output caching for GET endpoints (health, stats)
- Use `IAsyncEnumerable<T>` for large result sets

### Frontend Performance

- Lazy load routes with React.lazy()
- Use Web Workers for markdown parsing and token counting
- Debounce search inputs (300ms)
- Virtual scrolling for >100 items (react-window)
- Optimize images (next/image or vite-imagetools)

---

## Testing Strategy

### Backend Testing

- **Unit Tests**: Service logic in isolation (Moq for dependencies)
- **Integration Tests**: Full request → database → response
- **Coverage Target**: >80% for Services/, >60% overall
- **Run Before Commit**: `dotnet test --no-build`

### Frontend Testing

- **Component Tests**: Rendering, user interactions, edge cases
- **Hook Tests**: State updates, API calls (MSW for mocking)
- **Coverage Target**: >70% for hooks, >60% overall
- **Run Before Commit**: `pnpm test --run`

---

## Deployment Notes

### Docker (Staging/Dev)

- Port 5432 for PostgreSQL
- Uses SQL init scripts from `database/*.sql`
- Recreate: `docker-compose down -v && docker-compose up -d`

### Desktop App (macOS)

- Port 5433 for embedded PostgreSQL
- Uses EF Core migrations
- Build: `pnpm tauri build --target universal-apple-darwin`
- Sign: Requires Apple Developer cert

### Production

- PostgreSQL 18 managed instance
- .NET backend on Azure App Service
- Frontend on Vercel/Netlify
- Environment variables via platform secrets

---

## Learning Log

### Recently Learned (2025-12)

- PostgreSQL 18 temporal tables for version history
- Background summary generation with retry logic
- Hybrid search (vector + BM25) with RRF fusion
- Circuit breaker pattern for AI provider resilience
- Voice Agent architecture refactoring with Strategy + Factory pattern
- Disposal patterns for async orchestrators (check `_disposed` flag before semaphore access)
- Silence detection tuning for voice agents (`EndpointingMs` affects turn-taking behavior)
- xAI Grok Voice Realtime API integration via WebSocket (`wss://api.x.ai/v1/realtime`)
- xAI built-in tools (`web_search`, `x_search`) only need `Type` field - extra fields break them
- React stale closure pattern - use refs for state values accessed in callbacks
- Audio sample rate handling - must create AudioBuffer with source sample rate for correct playback
- xAI custom function tools - execute locally, send result via `conversation.item.create` with `type: "function_call_output"`, then trigger `response.create`
- Plugin tool building - use reflection to find `[KernelFunction]` methods, build JSON Schema from parameters
- Grok Voice default UI - set `voiceProviderType: 'GrokVoice'` in voice-slice.ts for default selection

### CSS Refactoring (2025-12)

- **Deleted `globals.css`** (2,445 lines) - Replaced with modular architecture
- **New structure**: `styles/globals/` (theme, animations, base, platform) + `styles/components/` (CSS modules)
- **CSS Modules**: `chat-input.module.css`, `toast.module.css`, `selection.module.css`
- **Global CSS**: `editor.css`, `dashboard.css`, `transitions.css` (for library/platform-specific styles)
- **Theme files**: `colors.css`, `effects.css`, `surfaces.css`, `buttons.css`
- **Benefits**: ~30% code reduction, better maintainability, clear separation of concerns

### Code Cleanup (2025-12)

- **Removed 7 deprecated store proxy files** - Use `useBoundStore` directly
- **No localStorage fallback** for draft storage - IndexedDB required
- **Strict store hydration** - throws on invalid persisted state types
- **Version creation errors propagate** - no silent swallowing
- **Vector store validation** - only 'PostgreSQL' and 'Pinecone' valid
- **Fixed test fixture schema mismatch** - `WebApplicationFactoryFixture` stored procedure updated to 12 params
- **See**: `docs/CODE_CLEANUP_2025_12.md` for full details

### Test Coverage Push (2025-12)

- **Frontend tests**: 3,211 tests (91.08% coverage)
- **Added**: 224 new utility/hook/component tests
- **New test files**: thinking-utils, note-reference-utils, model-context-limits, model-categorizer, default-models, multimodal-models, image-generation-models
- **Note**: Heavy mocking reduces coverage % - mocked hooks don't execute real code paths

### Implemented Features (Already in Codebase)

**SSE Error Recovery** - `frontend/src/hooks/use-unified-stream.ts:196-234`

- Exponential backoff with 3 max retries
- Retryable error detection (network failures, timeouts)
- Config in `lib/constants.ts`: BASE_DELAY=1000ms, BACKOFF_FACTOR=2

**RAG Reranking** - Dual provider support

- LLM-based: `Services/RAG/RerankerService.cs` (structured output + text fallback)
- Cohere native: `Services/RAG/CohereRerankerService.cs` (0-1 → 0-10 scale conversion)
- Final score: 70% rerank + 30% vector score
- Batch processing (5 items) to avoid rate limits

**Vector Index Tuning** - HNSW optimized

- Primary: `database/13_postgresql_18_features.sql:98-110` - HNSW (m=24, ef_construction=128)
- Quantized: `database/36_advanced_optimizations.sql` - halfvec (50% memory, same quality)
- Iterative scan: `hnsw.iterative_scan='relaxed_order'`, `ef_search=100`

**Streaming Cancellation** - Full client/server support

- Frontend: `AbortController` in `use-unified-stream.ts:81,250-251,353-359`
- Backend: `[EnumeratorCancellation] CancellationToken` in all 6 streaming strategies
- Graceful cleanup on unmount (Lines 495-502)

**Multi-modal RAG** - Image descriptions in embeddings

- `Services/RAG/ImageDescriptionService.cs` - Vision AI extraction (Gemini → OpenAI → Claude fallback)
- `Services/RAG/ChunkingService.cs:99-146` - Includes image descriptions in enriched content
- Prompts for OCR, visual elements, context-aware descriptions
- Batch processing with alt-text fallback

**GitHub Code Browser** - Full repository browsing and code viewing (Implemented 2025-12-17)

- Pattern: Backend (CQRS) → Service Layer → Frontend (TanStack Query hooks)
- API endpoints: `/github/tree` (recursive tree), `/github/contents/file` (file content)
- Backend: `GetRepositoryTreeQuery`, `GetFileContentQuery` with handlers
- Components:
  - `GitHubCodeBrowser` - Main container with split layout
  - `FileTreeView` - Hierarchical file navigation with expand/collapse
  - `FileTreeNode` - Recursive tree node with material icons
  - `CodeViewer` - Monaco editor with syntax highlighting
  - `FileSearchInput` - File name search/filter
- Libraries: `@monaco-editor/react` (syntax highlighting), `material-file-icons` (file icons)
- Utils: `build-file-tree.ts` - Converts flat tree to hierarchical structure
- Gotchas: GitHub API 1MB file limit, rate limiting (5k/hr), base64 decode for file contents
- Default tab: Code tab is now the default on GitHubPage

**Voice Agent** - Real-time voice conversation with AI (Implemented 2025-12-17, Refactored 2025-12-18)

- **Architecture** (Refactored 2025-12-18): Follows Strategy + Factory pattern like AgentStreamingStrategy
  - `VoiceOrchestrator` - Main WebSocket message router (scoped per connection)
  - `VoiceResponseProcessorFactory` - Resolves processor based on `session.Options.AgentEnabled`
  - `DirectAIResponseProcessor` - Non-agent AI streaming
  - `AgentResponseProcessor` - Agent mode with tools/RAG/thinking handling
  - `GrokVoiceResponseProcessor` - xAI Grok unified voice-to-voice (Added 2025-12-18)
  - `TTSOrchestrator` - Lazy TTS session init, auto-reconnection, audio callback
  - `TranscriptionOrchestrator` - Deepgram session lifecycle
  - `VoiceAnnouncementService` - TTS-friendly tool announcements, number spelling
  - `SentenceBufferingStrategy` - Buffer tokens until sentence boundaries
- Backend services: `DeepgramTranscriptionService`, `ElevenLabsSynthesisService`, `OpenAITTSSynthesisService`, `VoiceSessionManager`
- Frontend: `VoiceAgentPage`, `use-voice-session.ts` composite hook, `voice-slice.ts` Zustand
- Components: `VoiceOrb` (animated states), `VoiceControls`, `VoiceTranscript`, `VoiceSettings`
- Config: `appsettings.json` → `Voice` section (Deepgram, ElevenLabs, OpenAITTS, GrokVoice, Features)
- **Supported Providers**:
  - Standard Voice: Deepgram STT → AI → ElevenLabs/OpenAI TTS (16kHz)
  - Grok Voice: xAI Realtime unified voice-to-voice (24kHz) - Added 2025-12-18
  - Removed: GoogleTTS, AzureTTS (2025-12-18)
- **Tool Integration** (Added 2025-12-17):
  - Routes to `AgentService.ProcessStreamAsync()` when `AgentEnabled=true`
  - Supports all agent capabilities: notes CRUD, semantic search, web search, RAG
  - TTS announcements before tool execution ("Searching your notes...", "Found three relevant notes")
  - Thinking state tracking (`isInsideThinking`, `hasExitedThinking`) to exclude `<thinking>` blocks from TTS
  - Auto-reconnection on ElevenLabs timeout during long tool executions
  - Metadata events: `tool_call_start`, `tool_call_end`, `context_retrieval`, `thinking_step`, `grounding_sources`
- **Grok Voice Integration** (Added 2025-12-18):
  - Unified voice-to-voice model via `wss://api.x.ai/v1/realtime` WebSocket
  - <700ms latency (vs 1-2s for standard pipeline)
  - Backend: `GrokRealtime/` folder with `GrokRealtimeClient`, `GrokVoiceHandler`, `GrokRealtimeModels`, `GrokRealtimeEventParser`
  - Built-in tools: `web_search` (current events), `x_search` (X/Twitter search)
  - IMPORTANT: Built-in tools only need `Type` field - no `Name`/`Description`/`Parameters`
  - Audio: 24kHz PCM16 (vs 16kHz for standard) - frontend must respect source sample rate
  - Server-side VAD with configurable threshold and silence duration
  - Available voices: Sage, Ember, Maple, Cove, Ara
  - Uses existing `AIProviders.XAI.ApiKey` - no new API key needed
  - **Custom App Functions** (Added 2025-12-18):
    - Wired up Notes CRUD + Semantic Search tools to Grok Voice
    - Uses existing `IAgentPlugin` infrastructure (`NoteCrudPlugin`, `NoteSearchPlugin`)
    - Plugins registered via DI in `ServiceCollectionExtensions.cs`
    - Custom tools defined with JSON Schema parameters in session config
    - Execution flow: xAI calls tool → execute locally via `IToolExecutor` → send result via `conversation.item.create` → trigger `response.create`
    - Frontend: Grok Voice is default provider, App Functions enabled by default
    - Capabilities: `notes-crud` (CRUD operations), `notes-search` (semantic/keyword search)
- Key fixes implemented:
  - WebSocket message fragmentation (accumulate until `EndOfMessage`)
  - Binary audio handling for ElevenLabs PCM output
  - Server-side VAD (Voice Activity Detection) for background noise filtering
  - Transcription filters (min confidence 70%, min 2 words, min 3 chars)
  - ElevenLabs null boolean handling (`isFinal` can be null, use `ValueKind == JsonValueKind.True`)
  - Graceful shutdown with `intentionalDisconnect` flag to prevent reconnection spam
  - TTS chunking: sentence boundaries, 150-250 char word-boundary buffers, `try_trigger_generation` only on sentence ends
  - Real-time AI text streaming (`ai_response_chunk` metadata, `currentAssistantTranscript` state)
  - TTS-optimized system prompt (numbers as words, expand abbreviations, spell out symbols)
  - TTS session timeout reconnection (auto-reconnect if session disconnects during tool execution)
  - Race condition fix with `SemaphoreSlim` double-checked locking
  - Buffer clearing fix (`hasExitedThinking` flag to clear only once)
  - ObjectDisposedException fix with `_disposed` flag checks before semaphore access (2025-12-18)
  - Silence detection tuning: `EndpointingMs` and `SilenceTimeoutMs` set to 2500ms (2025-12-18)
- VAD tuning: `SpeechThresholdMultiplier=3.0`, `MinSpeechThreshold=0.01`, `SilentFramesToEndSpeech=15`
- **Silence Detection**: `EndpointingMs=2500`, `SilenceTimeoutMs=2500` (higher = more patient, waits longer before responding)
- Gotchas:
  - ElevenLabs sends binary for PCM formats, large JSON messages get fragmented
  - ElevenLabs `isFinal` property can be `null` (not just true/false) - check `ValueKind`
  - ElevenLabs has ~20 second input timeout - need auto-reconnection for long tool executions
  - Noise floor calibration takes ~30 frames
  - Text chunking affects speech quality - don't send on every comma, wait for sentence ends
  - LLM output needs TTS-specific formatting (no numbers, abbreviations, symbols)
  - Thinking blocks from Claude must be excluded from TTS (track state, don't check accumulated buffer)
  - Orchestrators need `_disposed` flag checks before accessing `SemaphoreSlim` to avoid ObjectDisposedException on session cleanup
  - **Grok Voice**: Built-in tools (`web_search`, `x_search`) ONLY need `Type` field - adding `Name`, `Description`, or `Parameters` causes them to fail
  - **Grok Voice**: Audio is 24kHz (vs 16kHz standard) - frontend AudioBuffer must use source sample rate
  - **Grok Voice**: React callbacks capturing state values will be stale - use refs and access `ref.current` in callbacks
  - **Grok Voice**: Frontend must emit `tool_call_start` AND `tool_call_end` for UI to show tool completion

### To Explore

- [ ] Real-time collaboration (WebSocket/CRDT for shared notes)
- [ ] Offline-first with service workers
- [x] Voice input/transcription for notes (Implemented as Voice Agent - 2025-12-17)
- [x] Voice Agent Tool Integration (Implemented 2025-12-17) - notes, web search, RAG via AgentService
- [x] xAI Grok Voice Integration (Implemented 2025-12-18) - unified voice-to-voice with built-in web/X search
- [x] Grok Voice Custom App Functions (Implemented 2025-12-18) - Notes CRUD + Semantic Search tools wired to Grok Voice

---

## Quick Reference Commands

```bash
# Database
./database/migrate.sh status              # Check migration state
./database/migrate.sh run                 # Apply pending migrations
./database/migrate.sh diff                # Compare Docker vs Desktop

# Backend
dotnet watch run                          # Hot reload (from API project)
dotnet test --filter "FullyQualifiedName~RagService"  # Run specific tests
dotnet ef migrations add MigrationName    # Create migration

# Frontend
pnpm dev                                  # Dev server
pnpm test --ui                            # Test UI with Vitest
pnpm tauri dev                            # Desktop app dev mode

# Docker
docker-compose up -d                      # Start services
docker-compose logs -f backend            # Follow backend logs
docker-compose down -v                    # Stop and remove volumes

# Git
git checkout -b feature/description       # Create feature branch
git commit -m "feat: description"         # Conventional commit
git push -u origin feature/description    # Push and set upstream
```

---

## Notes to Future Self

- Always check `./database/migrate.sh diff` after pulling main
- Desktop app PostgreSQL runs on 5433, not 5432
- User preferences require 13-file update (see CLAUDE.md checklist)
- RAG query expansion adds ~200ms latency (toggle if needed)
- Circuit breaker opens at 50% failure rate within 30s window
- Zustand store persists to localStorage (check browser DevTools → Application)

---

**Remember**: This file is for long-term memory. Put current session work in `.claude/session.md`.
