# ADR 010: HybridCache for Distributed Caching

## Status

Accepted

## Context

Second Brain's embedding generation is computationally expensive:

- **External API calls** - Each embedding costs ~$0.0001 and adds latency
- **Repeated content** - Same notes queried multiple times
- **Cache stampede** - Multiple concurrent requests for uncached embeddings
- **Memory constraints** - Large embedding vectors (1536 floats) consume memory

Our previous `IMemoryCache` implementation had limitations:

1. No L2 distributed cache tier
2. No built-in stampede protection
3. Manual serialization for distributed scenarios
4. No coordinated invalidation

## Decision

We will use **.NET 9+ HybridCache** for two-tier caching with automatic stampede protection.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │   HybridCache   │                           │
│                   └────────┬────────┘                           │
│                            │                                     │
│              ┌─────────────┼─────────────┐                      │
│              ▼                           ▼                       │
│     ┌─────────────────┐         ┌─────────────────┐            │
│     │   L1 Memory     │         │   L2 Redis      │            │
│     │   (in-process)  │         │   (distributed) │            │
│     │   TTL: 5 min    │         │   TTL: 30 min   │            │
│     └─────────────────┘         └─────────────────┘            │
│                                                                  │
│     ┌─────────────────────────────────────────────┐             │
│     │            Stampede Protection               │             │
│     │  (single factory execution per key)          │             │
│     └─────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**Configuration:**

```csharp
services.AddHybridCache(options =>
{
    options.MaximumPayloadBytes = 1024 * 1024; // 1MB max
    options.MaximumKeyLength = 256;
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(30),        // L2 TTL
        LocalCacheExpiration = TimeSpan.FromMinutes(5) // L1 TTL
    };
});

// Optional: Redis as L2 cache
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
    options.InstanceName = "SecondBrain:";
});
```

**CachedEmbeddingProvider:**

```csharp
public class CachedEmbeddingProvider : IEmbeddingProvider
{
    private readonly IEmbeddingProvider _innerProvider;
    private readonly HybridCache _cache;

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"embedding:{ComputeHash(text)}";

        // HybridCache handles:
        // 1. Check L1 (memory)
        // 2. Check L2 (Redis) if L1 miss
        // 3. Execute factory if both miss
        // 4. Stampede protection (single execution)
        // 5. Populate both caches
        var result = await _cache.GetOrCreateAsync(
            cacheKey,
            async cancel =>
            {
                TelemetryConfiguration.CacheMissesTotal.Add(1);
                return await _innerProvider.GenerateEmbeddingAsync(text, cancel);
            },
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromHours(24),
                LocalCacheExpiration = TimeSpan.FromMinutes(30)
            },
            cancellationToken: cancellationToken);

        TelemetryConfiguration.CacheHitsTotal.Add(1);
        return result;
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..32];
    }
}
```

### Stampede Protection

HybridCache automatically prevents cache stampede:

```text
Without HybridCache (stampede):           With HybridCache:
                                          
T1: Cache miss → Generate embedding       T1: Cache miss → Generate embedding
T2: Cache miss → Generate embedding       T2: Cache miss → Wait for T1
T3: Cache miss → Generate embedding       T3: Cache miss → Wait for T1
T4: Cache miss → Generate embedding       T4: Cache miss → Wait for T1
                                          
Result: 4 API calls                       Result: 1 API call, 3 waits
```

### Cache Key Strategy

| Content Type | Key Format | TTL |
|--------------|------------|-----|
| Embeddings | `embedding:{sha256-hash}` | 24 hours |
| AI Responses (temp=0) | `ai:{model}:{prompt-hash}` | 1 hour |
| RAG Results | Not cached (dynamic) | N/A |

## Consequences

### Positive

- **Cost savings** - 90%+ cache hit rate reduces API costs
- **Latency reduction** - L1 hits: <1ms, L2 hits: ~5ms vs API: ~200ms
- **Stampede protection** - Built-in, no custom locking needed
- **Two-tier caching** - Hot data in memory, warm data in Redis
- **Serialization** - Automatic, no manual JSON handling
- **Scalability** - Works across multiple API instances with L2

### Negative

- **Memory usage** - L1 cache consumes application memory
- **Redis dependency** - L2 requires Redis infrastructure (optional)
- **Stale data window** - Up to TTL duration for stale embeddings

### Neutral

- Hash-based keys ensure content-addressable caching
- Embeddings are immutable (same text = same embedding)
- TTL tunable based on content change frequency

## Configuration Reference

```json
{
  "Caching": {
    "Hybrid": {
      "MaximumPayloadBytes": 1048576,
      "DefaultExpiration": "00:30:00",
      "LocalCacheExpiration": "00:05:00"
    },
    "Redis": {
      "Configuration": "localhost:6379",
      "InstanceName": "SecondBrain:"
    }
  }
}
```

## Related ADRs

- [ADR 009: OpenTelemetry Observability](009-opentelemetry-observability.md) - Cache metrics tracked
- [ADR 011: Backend Performance Optimizations](011-backend-performance-optimizations.md) - Part of overall performance strategy
