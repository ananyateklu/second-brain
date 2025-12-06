# ADR 011: Backend Performance Optimizations

## Status

Accepted

## Context

As Second Brain scaled, we identified several performance bottlenecks:

1. **Large JSON payloads** - Chat conversations with many messages
2. **Slow database queries** - Complex includes causing N+1 problems
3. **Repeated read operations** - Same data fetched multiple times
4. **Memory pressure** - Frequent allocations in hot paths
5. **Error responses** - Inconsistent error formats

We needed a comprehensive performance strategy covering serialization, database access, caching, memory management, and error handling.

## Decision

We will implement multiple .NET 10 performance optimizations as a cohesive strategy.

### 1. Response Compression (Brotli/GZip)

```csharp
services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "text/event-stream", // SSE streaming
    });
});

services.Configure<BrotliCompressionProviderOptions>(options =>
    options.Level = CompressionLevel.Fastest);
```

**Impact:** 20-70% bandwidth reduction for JSON responses.

### 2. Source-Generated JSON Serialization

```csharp
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(NoteResponse))]
[JsonSerializable(typeof(ChatConversationResponse))]
[JsonSerializable(typeof(RagAnalyticsResponse))]
// ... 100+ types registered
public partial class AppJsonContext : JsonSerializerContext { }
```

**Impact:** Faster serialization, reduced allocations, smaller binary size.

### 3. Output Caching with Tag-Based Invalidation

```csharp
services.AddOutputCache(options =>
{
    options.AddPolicy("AIHealth", b => b.Expire(TimeSpan.FromSeconds(30)).Tag("ai-health"));
    options.AddPolicy("Stats", b => b.Expire(TimeSpan.FromMinutes(5)).Tag("stats"));
    options.AddPolicy("RagAnalytics", b => b.Expire(TimeSpan.FromMinutes(10)).Tag("rag-analytics"));
});

// Invalidation service
public class OutputCacheInvalidator : ICacheInvalidator
{
    public async Task InvalidateNotesAsync(string userId)
        => await _store.EvictByTagAsync("notes", CancellationToken.None);
}
```

**Impact:** Reduced compute for frequently-read endpoints.

### 4. EF Core Compiled Queries

```csharp
public class SqlNoteRepository : INoteRepository
{
    private static readonly Func<ApplicationDbContext, string, IAsyncEnumerable<Note>>
        GetByUserIdQuery = EF.CompileAsyncQuery(
            (ApplicationDbContext ctx, string userId) =>
                ctx.Notes
                    .AsNoTracking()
                    .Where(n => n.UserId == userId && !n.IsDeleted)
                    .OrderByDescending(n => n.UpdatedAt));

    public IAsyncEnumerable<Note> GetByUserIdAsync(string userId)
        => GetByUserIdQuery(_context, userId);
}
```

**Impact:** Eliminates query compilation overhead on hot paths.

### 5. Split Queries for Complex Includes

```csharp
var conversations = await _context.ChatConversations
    .Include(c => c.Messages)
        .ThenInclude(m => m.ToolCalls)
    .Include(c => c.Messages)
        .ThenInclude(m => m.RetrievedNotes)
    .AsSplitQuery() // Multiple SQL queries instead of cartesian explosion
    .ToListAsync(cancellationToken);
```

**Impact:** Reduced memory usage for complex object graphs.

### 6. Memory Optimizations

```csharp
// ArrayPool for temporary buffers
var buffer = ArrayPool<float>.Shared.Rent(1536);
try
{
    ProcessIntoBuffer(data.Span, buffer);
}
finally
{
    ArrayPool<float>.Shared.Return(buffer, clearArray: true);
}

// StringBuilder pooling
private readonly ObjectPool<StringBuilder> _pool;
var sb = _pool.Get();
try { /* use sb */ }
finally { _pool.Return(sb); }

// Span<T> for string operations
ReadOnlySpan<char> input = text.AsSpan();
var colonIndex = input.IndexOf(':');
```

**Impact:** Reduced GC pressure, fewer allocations.

### 7. Problem Details (RFC 9457)

```csharp
services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] =
            Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
        context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
    };
});
```

**Impact:** Standardized error responses with debugging info.

### 8. TimeProvider Abstraction

```csharp
// Registration
services.AddSingleton(TimeProvider.System);

// Usage in services
public TokenService(TimeProvider timeProvider)
{
    var now = _timeProvider.GetUtcNow();
}

// Testing with FakeTimeProvider
var fakeTime = new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero));
fakeTime.Advance(TimeSpan.FromHours(2));
```

**Impact:** Deterministic time-based testing.

### 9. Enhanced Health Checks

```csharp
services.AddHealthChecks()
    .AddCheck<PostgresHealthCheck>("postgresql", tags: new[] { "db", "ready" })
    .AddCheck<AIProviderHealthCheck>("ai-providers", tags: new[] { "ai", "ready" })
    .AddCheck<VectorStoreHealthCheck>("vector-store", tags: new[] { "vectorstore", "ready" });

// Separate endpoints for Kubernetes probes
app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });
app.MapHealthChecks("/health/live", new() { Predicate = c => c.Tags.Contains("live") });
```

**Impact:** Granular health monitoring for Kubernetes deployments.

### Implementation Files

| Optimization | File Location |
|--------------|---------------|
| Response Compression | `Program.cs`, `ServiceCollectionExtensions.cs` |
| Source-Generated JSON | `Serialization/AppJsonContext.cs` |
| Output Caching | `Caching/OutputCacheInvalidator.cs` |
| Compiled Queries | `Repositories/SqlNoteRepository.cs`, `SqlChatRepository.cs` |
| Memory Optimizations | `Utilities/MemoryOptimizations.cs` |
| Health Checks | `HealthChecks/*.cs` |
| TimeProvider | `ServiceCollectionExtensions.cs` |

## Consequences

### Positive

- **20-70% bandwidth savings** from compression
- **Faster serialization** with source-generated JSON
- **Reduced database load** via output caching
- **Eliminated N+1 queries** with compiled queries and split queries
- **Lower GC pressure** with memory pooling
- **Consistent error handling** with Problem Details
- **Testable time logic** with TimeProvider
- **Production-ready health checks** for container orchestration

### Negative

- **Complexity** - More code to maintain
- **Build time** - Source generators add compilation overhead
- **Memory trade-offs** - Caching consumes memory

### Neutral

- All optimizations are opt-in via configuration
- Performance benchmarks available in `benchmarks/SecondBrain.Benchmarks/`
- Metrics exposed via OpenTelemetry for monitoring impact

## Related ADRs

- [ADR 009: OpenTelemetry Observability](009-opentelemetry-observability.md) - Performance metrics
- [ADR 010: HybridCache for Distributed Caching](010-hybridcache-distributed-caching.md) - Embedding caching
- [ADR 006: CQRS with MediatR](006-cqrs-mediatr-pattern.md) - Pipeline optimized
