# ADR 009: OpenTelemetry Observability

## Status

Accepted

## Context

Second Brain has complex distributed operations that are difficult to debug:

- **AI Provider Calls** - Multiple external API calls with varying latency
- **RAG Pipeline** - Multi-stage retrieval (query expansion, vector search, reranking)
- **Agent Execution** - Tool calls with external dependencies
- **Embedding Generation** - Batch processing with caching layers

We needed comprehensive observability that:

1. Traces requests across AI providers
2. Provides metrics for performance monitoring
3. Correlates logs with traces for debugging
4. Monitors circuit breaker states
5. Tracks cache hit/miss ratios

## Decision

We will use **OpenTelemetry** for unified observability with custom instrumentation for AI-specific operations.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Activity Sources (Tracing)     │  Meters (Metrics)             │
│  ├─ SecondBrain.AIProvider      │  ├─ ai_requests_total         │
│  ├─ SecondBrain.RAGPipeline     │  ├─ ai_errors_total           │
│  ├─ SecondBrain.Agent           │  ├─ ai_response_duration_ms   │
│  ├─ SecondBrain.Embedding       │  ├─ rag_queries_total         │
│  └─ SecondBrain.Chat            │  ├─ cache_hits_total          │
│                                 │  └─ cache_misses_total        │
├─────────────────────────────────────────────────────────────────┤
│           OpenTelemetry SDK + Auto-Instrumentation               │
│  ├─ ASP.NET Core                                                │
│  ├─ HttpClient (AI provider calls)                              │
│  └─ Entity Framework Core                                       │
├─────────────────────────────────────────────────────────────────┤
│                      Exporters                                   │
│  ├─ OTLP (Jaeger, Tempo, etc.)                                  │
│  ├─ Prometheus (/metrics endpoint)                              │
│  └─ Console (development)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**TelemetryConfiguration.cs:**

```csharp
public static class TelemetryConfiguration
{
    public const string ServiceName = "SecondBrain.API";
    public const string ServiceVersion = "1.0.0";

    // Activity Sources for Tracing
    public static readonly ActivitySource AIProviderSource = new("SecondBrain.AIProvider");
    public static readonly ActivitySource RAGPipelineSource = new("SecondBrain.RAGPipeline");
    public static readonly ActivitySource AgentSource = new("SecondBrain.Agent");
    public static readonly ActivitySource EmbeddingSource = new("SecondBrain.Embedding");
    public static readonly ActivitySource ChatSource = new("SecondBrain.Chat");

    // Meters for Metrics
    public static readonly Meter AIMetrics = new("SecondBrain.AI", ServiceVersion);
    public static readonly Meter RAGMetrics = new("SecondBrain.RAG", ServiceVersion);

    // Counters
    public static readonly Counter<long> AIRequestsTotal;
    public static readonly Counter<long> AIErrorsTotal;
    public static readonly Counter<long> TokensProcessed;
    public static readonly Counter<long> RAGQueriesTotal;
    public static readonly Counter<long> CacheHitsTotal;
    public static readonly Counter<long> CacheMissesTotal;

    // Histograms
    public static readonly Histogram<double> AIResponseDuration;
    public static readonly Histogram<double> RAGRetrievalDuration;
    public static readonly Histogram<double> EmbeddingGenerationDuration;
    public static readonly Histogram<int> RAGDocumentsRetrieved;
    public static readonly Histogram<double> RelevanceScores;
}
```

**Instrumented AI Provider:**

```csharp
public async IAsyncEnumerable<string> StreamResponseAsync(...)
{
    using var activity = TelemetryConfiguration.AIProviderSource.StartActivity(
        "AI.StreamResponse", ActivityKind.Client);
    
    activity?.SetTag("ai.provider", Name);
    activity?.SetTag("ai.model", model);
    
    var stopwatch = Stopwatch.StartNew();
    
    try
    {
        TelemetryConfiguration.AIRequestsTotal.Add(1,
            new KeyValuePair<string, object?>("provider", Name));
        
        await foreach (var chunk in InternalStreamAsync(...))
        {
            yield return chunk;
        }
        
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
    catch (Exception ex)
    {
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        TelemetryConfiguration.AIErrorsTotal.Add(1,
            new KeyValuePair<string, object?>("provider", Name));
        throw;
    }
    finally
    {
        TelemetryConfiguration.AIResponseDuration.Record(
            stopwatch.ElapsedMilliseconds,
            new KeyValuePair<string, object?>("provider", Name));
    }
}
```

**Log Correlation with TraceIdEnricher:**

```csharp
public class TraceIdEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory factory)
    {
        var activity = Activity.Current;
        if (activity != null)
        {
            logEvent.AddPropertyIfAbsent(factory.CreateProperty("TraceId", activity.TraceId));
            logEvent.AddPropertyIfAbsent(factory.CreateProperty("SpanId", activity.SpanId));
        }
    }
}
```

### Metrics Exposed

| Metric | Type | Description |
|--------|------|-------------|
| `ai_requests_total` | Counter | Total AI provider requests |
| `ai_errors_total` | Counter | Total AI provider errors |
| `ai_response_duration_ms` | Histogram | AI response latency |
| `rag_queries_total` | Counter | Total RAG queries |
| `rag_retrieval_duration_ms` | Histogram | RAG retrieval time |
| `cache_hits_total` | Counter | Embedding cache hits |
| `cache_misses_total` | Counter | Embedding cache misses |
| `circuit_breaker_state` | Gauge | Circuit breaker state per provider |

## Consequences

### Positive

- **End-to-end tracing** - See complete request flow through AI pipelines
- **Performance insights** - Identify slow providers, cache efficiency
- **Error correlation** - Link errors to specific traces
- **Alerting ready** - Prometheus metrics enable alerting rules
- **Vendor agnostic** - OTLP export works with Jaeger, Tempo, Zipkin, etc.
- **Auto-instrumentation** - HTTP, EF Core, ASP.NET Core traced automatically

### Negative

- **Overhead** - Small performance cost for tracing (mitigated by sampling)
- **Infrastructure** - Requires running a trace collector (Jaeger, etc.)
- **Data volume** - High-traffic scenarios generate significant trace data

### Neutral

- Console exporter enabled in development only
- Prometheus endpoint exposed at `/metrics`
- Sampling rate configurable via `OTEL_TRACES_SAMPLER_ARG`

## Related ADRs

- [ADR 004: AI Provider Factory Pattern](004-ai-provider-factory-pattern.md) - Providers are instrumented
- [ADR 010: HybridCache for Distributed Caching](010-hybridcache-distributed-caching.md) - Cache metrics tracked
