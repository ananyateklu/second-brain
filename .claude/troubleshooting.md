# Troubleshooting Guide

> Import this file when debugging issues: `@.claude/troubleshooting.md`

---

## Backend Issues

### EF Core not saving changes
**Cause**: Repository doesn't copy properties to tracked entity in `UpdateAsync`
**Solution**: Always copy all properties in `SqlUserRepository.UpdateAsync()`

### Circuit breaker stuck open
**Cause**: Too many failures to AI provider
**Solution**: Check provider health, restart via `GET /health/circuit-breaker/{provider}/reset`

### Migrations out of sync
**Cause**: Docker vs Desktop using different schema sources
**Solution**: Run `./database/migrate.sh diff` to compare, then `sync-to-docker` or `sync-to-desktop`

---

## Frontend Issues

### State not persisting to localStorage
**Cause**: Missing property in `partialize` or `merge` functions
**Solution**: Update `bound-store.ts` with new state property

### Store hydration error on load
**Cause**: Corrupted localStorage with invalid field values
**Solution**: Clear localStorage in browser DevTools -> Application -> Clear site data

### Query not refetching
**Cause**: Query key not invalidated after mutation
**Solution**: Call `queryClient.invalidateQueries({ queryKey: noteKeys.all })`

### "useUIStore/useThemeStore is not defined"
**Cause**: Old import from deleted deprecated store proxies
**Solution**: Import from `useBoundStore` instead

### Test mock type mismatches
**Cause**: Mock objects don't match updated TypeScript interfaces
**Solution**: Update mock helpers to include all required properties

### GitHub API rate limit exceeded
**Cause**: Too many requests (5,000/hour for authenticated)
**Solution**: Use aggressive TanStack Query caching (5-10 min staleTime)

---

## Voice Agent Issues

### ElevenLabs audio stops mid-sentence
**Cause**: `isFinal.GetBoolean()` crashes when ElevenLabs sends `"isFinal": null`
**Solution**: Use `isFinal.ValueKind == JsonValueKind.True` instead of `GetBoolean()`

### TTS skips words or sounds choppy
**Cause**: Text sent in too-small chunks
**Solution**: Send on sentence-end punctuation only, use 150-250 char buffers at word boundaries

### WebSocket reconnection spam after stopping session
**Cause**: Backend closes connection before frontend's `close(1000)` is processed
**Solution**: Add `intentionalDisconnect` flag, check in `handleClose`

### TTS session times out during long tool execution
**Cause**: ElevenLabs has ~20 second input timeout
**Solution**: Implement auto-reconnection in `EnsureSynthesisSessionAsync()` - check `IsConnected`, dispose old session, create new

### ObjectDisposedException on session cleanup
**Cause**: Callbacks arrive after orchestrator is disposed, accessing disposed `SemaphoreSlim`
**Solution**: Add `_disposed` flag, check BEFORE attempting `WaitAsync()` on semaphore

---

## Grok Voice Issues

### xAI built-in tools not working
**Cause**: Built-in tools (`web_search`, `x_search`) defined with extra fields
**Solution**: For xAI built-in tools, only specify `Type` field:
```csharp
public static GrokRealtimeTool WebSearch() => new()
{
    Type = "web_search"
    // Note: Built-in tools don't need name, description, or parameters
};
```

### Grok Voice audio plays deep/slow
**Cause**: Sample rate mismatch - frontend defaulting to 16kHz but Grok sends 24kHz
**Solution**: Backend sends `sampleRate` with audio chunks, frontend creates AudioBuffer with source sample rate

### Grok Voice stops hearing after first response
**Cause**: React stale closure - callback captured initial state values
**Solution**: Use refs (`isMicrophoneEnabledRef`) and access `ref.current` in callbacks

### Grok Voice tool indicator shows "running" indefinitely
**Cause**: Backend only sent `grounding_sources` event, not `tool_call_start`/`tool_call_end`
**Solution**: Update `HandleFunctionCallDoneAsync` to emit all three events

---

## Testing Issues

### Integration tests fail with "function does not exist"
**Cause**: `WebApplicationFactoryFixture.ApplyVersioningSchema()` out of sync with production
**Solution**: Update test fixture to match `database/*.sql` schema

### CI tests fail with "duplicate key" errors
**Cause**: Multiple test instances run concurrently against shared PostgreSQL
**Solution**: Wrap idempotent operations in try-catch for PostgreSQL error codes 23505, 42701

---

## Performance Tips

### Database
- Use `EXPLAIN ANALYZE` for slow queries (>100ms)
- Batch inserts for >10 notes (use `COPY` command)
- Run `VACUUM ANALYZE` weekly on `note_embeddings`

### Backend
- Use `AsNoTracking()` for read-only queries
- Enable output caching for GET endpoints (health, stats)
- Use `IAsyncEnumerable<T>` for large result sets

### Frontend
- Lazy load routes with `React.lazy()`
- Debounce search inputs (300ms)
- Virtual scrolling for >100 items (react-window)
