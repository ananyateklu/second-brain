# Backend Performance and .NET 10 Enhancement Guide

This comprehensive guide outlines performance optimizations, debugging enhancements, and modern .NET 10 features for the Second Brain backend. The guide is designed to be implemented incrementally, with high-priority items first.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [OpenTelemetry Integration](#1-opentelemetry-integration-high-priority)
3. [HybridCache Implementation](#2-hybridcache-implementation-high-priority)
4. [Response Compression](#3-response-compression)
5. [Source-Generated JSON](#4-source-generated-json)
6. [Output Caching](#5-output-caching)
7. [Memory Optimizations](#6-memory-optimizations)
8. [EF Core Optimizations](#7-ef-core-optimizations)
9. [Health Check Enhancements](#8-health-check-enhancements)
10. [Problem Details Middleware](#9-problem-details-middleware)
11. [Testing Improvements](#10-testing-improvements)
12. [Implementation Checklist](#implementation-checklist)

---

## Current State Analysis

### What's Already Implemented ✅

| Feature | Status | Location |
|---------|--------|----------|
| **.NET 10 Target Framework** | ✅ Complete | All `.csproj` files |
| **Serilog Structured Logging** | ✅ Complete | `Program.cs` |
| **MediatR CQRS Pattern** | ✅ Complete | `Application/Commands/`, `Application/Queries/` |
| **Circuit Breaker (Polly)** | ✅ Complete | `AIProviderCircuitBreaker.cs` |
| **IMemoryCache for Embeddings** | ✅ Complete | `CachedEmbeddingProvider.cs` |
| **IAsyncEnumerable Streaming** | ✅ Complete | All AI providers, controllers |
| **PostgreSQL 18 Features** | ✅ Complete | UUIDv7, AIO, pgvector 0.8, Native BM25 |
| **Global Exception Middleware** | ✅ Complete | `GlobalExceptionMiddleware.cs` |
| **Basic Health Checks** | ✅ Complete | `PostgresHealthCheck.cs` |

### Gaps to Address 🔴

| Feature | Priority | Impact |
|---------|----------|--------|
| OpenTelemetry Tracing | High | Distributed debugging, performance insights |
| HybridCache | High | Reduced latency, stampede protection |
| Response Compression | Medium | Bandwidth savings (20-70%) |
| Source-Generated JSON | Medium | Faster serialization, smaller memory footprint |
| Output Caching | Medium | Reduced compute for read endpoints |
| Memory Optimizations | Medium | Reduced GC pressure |
| Enhanced Health Checks | Low | Better operational visibility |
| Problem Details (RFC 9457) | Low | Standardized error responses |
| TimeProvider Abstraction | Low | Better testability |

---

## 1. OpenTelemetry Integration (High Priority)

OpenTelemetry provides distributed tracing, metrics, and log correlation—essential for debugging complex AI pipelines and RAG operations.

### 1.1 Install Required Packages

Add to `SecondBrain.API.csproj`:

```xml
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" Version="1.0.0-beta.12" />
<PackageReference Include="OpenTelemetry.Exporter.Console" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.10.0" />
<PackageReference Include="Serilog.Enrichers.Span" Version="3.1.0" />
```

### 1.2 Create Telemetry Configuration

Create `backend/src/SecondBrain.API/Telemetry/TelemetryConfiguration.cs`:

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace SecondBrain.API.Telemetry;

/// <summary>
/// Centralized telemetry configuration for the Second Brain application.
/// Defines ActivitySources for tracing and Meters for metrics.
/// </summary>
public static class TelemetryConfiguration
{
    public const string ServiceName = "SecondBrain.API";
    public const string ServiceVersion = "1.0.0";

    // Activity Sources for Tracing
    public static readonly ActivitySource AIProviderSource = new("SecondBrain.AIProvider");
    public static readonly ActivitySource RAGPipelineSource = new("SecondBrain.RAGPipeline");
    public static readonly ActivitySource AgentSource = new("SecondBrain.Agent");
    public static readonly ActivitySource EmbeddingSource = new("SecondBrain.Embedding");

    // Meters for Metrics
    public static readonly Meter AIMetrics = new("SecondBrain.AI", ServiceVersion);
    public static readonly Meter RAGMetrics = new("SecondBrain.RAG", ServiceVersion);

    // Counters
    public static readonly Counter<long> AIRequestsTotal = AIMetrics.CreateCounter<long>(
        "ai_requests_total",
        description: "Total number of AI provider requests");

    public static readonly Counter<long> AIErrorsTotal = AIMetrics.CreateCounter<long>(
        "ai_errors_total",
        description: "Total number of AI provider errors");

    public static readonly Counter<long> RAGQueriesTotal = RAGMetrics.CreateCounter<long>(
        "rag_queries_total",
        description: "Total number of RAG queries");

    public static readonly Counter<long> CacheHitsTotal = RAGMetrics.CreateCounter<long>(
        "cache_hits_total",
        description: "Total embedding cache hits");

    public static readonly Counter<long> CacheMissesTotal = RAGMetrics.CreateCounter<long>(
        "cache_misses_total",
        description: "Total embedding cache misses");

    // Histograms
    public static readonly Histogram<double> AIResponseDuration = AIMetrics.CreateHistogram<double>(
        "ai_response_duration_ms",
        unit: "ms",
        description: "AI provider response duration in milliseconds");

    public static readonly Histogram<double> RAGRetrievalDuration = RAGMetrics.CreateHistogram<double>(
        "rag_retrieval_duration_ms",
        unit: "ms",
        description: "RAG retrieval duration in milliseconds");

    public static readonly Histogram<double> EmbeddingGenerationDuration = AIMetrics.CreateHistogram<double>(
        "embedding_generation_duration_ms",
        unit: "ms",
        description: "Embedding generation duration in milliseconds");

    public static readonly Histogram<int> RAGDocumentsRetrieved = RAGMetrics.CreateHistogram<int>(
        "rag_documents_retrieved",
        description: "Number of documents retrieved per RAG query");

    // Gauges (via ObservableGauge)
    public static readonly ObservableGauge<int> CircuitBreakerState = AIMetrics.CreateObservableGauge(
        "circuit_breaker_state",
        () => GetCircuitBreakerStates(),
        description: "Circuit breaker state (0=Closed, 1=Open, 2=HalfOpen)");

    private static IEnumerable<Measurement<int>> GetCircuitBreakerStates()
    {
        // This will be populated by the circuit breaker service
        yield break;
    }
}
```

### 1.3 Register OpenTelemetry in Program.cs

Add to `Program.cs` after builder creation:

```csharp
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using SecondBrain.API.Telemetry;

// OpenTelemetry Configuration
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(
            serviceName: TelemetryConfiguration.ServiceName,
            serviceVersion: TelemetryConfiguration.ServiceVersion)
        .AddAttributes(new Dictionary<string, object>
        {
            ["deployment.environment"] = builder.Environment.EnvironmentName
        }))
    .WithTracing(tracing => tracing
        // Auto-instrumentation
        .AddAspNetCoreInstrumentation(options =>
        {
            options.RecordException = true;
            options.Filter = httpContext =>
            {
                // Don't trace health check endpoints
                var path = httpContext.Request.Path.Value;
                return path != null && !path.StartsWith("/health");
            };
        })
        .AddHttpClientInstrumentation(options =>
        {
            options.RecordException = true;
            // Enrich with AI provider info
            options.EnrichWithHttpRequestMessage = (activity, request) =>
            {
                if (request.RequestUri?.Host.Contains("openai") == true)
                    activity.SetTag("ai.provider", "OpenAI");
                else if (request.RequestUri?.Host.Contains("anthropic") == true)
                    activity.SetTag("ai.provider", "Anthropic");
                else if (request.RequestUri?.Host.Contains("googleapis") == true)
                    activity.SetTag("ai.provider", "Gemini");
            };
        })
        .AddEntityFrameworkCoreInstrumentation(options =>
        {
            options.SetDbStatementForText = true;
        })
        // Custom sources
        .AddSource(TelemetryConfiguration.AIProviderSource.Name)
        .AddSource(TelemetryConfiguration.RAGPipelineSource.Name)
        .AddSource(TelemetryConfiguration.AgentSource.Name)
        .AddSource(TelemetryConfiguration.EmbeddingSource.Name)
        // Exporters
        .AddConsoleExporter() // Development only
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri(
                builder.Configuration["OpenTelemetry:OtlpEndpoint"] 
                ?? "http://localhost:4317");
        }))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddMeter(TelemetryConfiguration.AIMetrics.Name)
        .AddMeter(TelemetryConfiguration.RAGMetrics.Name)
        .AddPrometheusExporter() // For Prometheus scraping
        .AddOtlpExporter());

// Map Prometheus endpoint
app.MapPrometheusScrapingEndpoint("/metrics");
```

### 1.4 Instrument AI Providers

Example instrumentation for `OpenAIProvider.cs`:

```csharp
using System.Diagnostics;
using SecondBrain.API.Telemetry;

public class OpenAIProvider : IAIProvider
{
    public async IAsyncEnumerable<string> StreamResponseAsync(
        string prompt,
        string model,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var activity = TelemetryConfiguration.AIProviderSource.StartActivity(
            "OpenAI.StreamResponse",
            ActivityKind.Client);

        activity?.SetTag("ai.provider", "OpenAI");
        activity?.SetTag("ai.model", model);
        activity?.SetTag("ai.prompt.length", prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            TelemetryConfiguration.AIRequestsTotal.Add(1,
                new KeyValuePair<string, object?>("provider", "OpenAI"),
                new KeyValuePair<string, object?>("model", model));

            var tokenCount = 0;

            await foreach (var chunk in StreamFromOpenAIAsync(prompt, model, cancellationToken))
            {
                tokenCount++;
                yield return chunk;
            }

            activity?.SetTag("ai.tokens.output", tokenCount);
            activity?.SetStatus(ActivityStatusCode.Ok);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);

            TelemetryConfiguration.AIErrorsTotal.Add(1,
                new KeyValuePair<string, object?>("provider", "OpenAI"),
                new KeyValuePair<string, object?>("error_type", ex.GetType().Name));

            throw;
        }
        finally
        {
            stopwatch.Stop();
            TelemetryConfiguration.AIResponseDuration.Record(
                stopwatch.ElapsedMilliseconds,
                new KeyValuePair<string, object?>("provider", "OpenAI"),
                new KeyValuePair<string, object?>("model", model));
        }
    }
}
```

### 1.5 Instrument RAG Pipeline

Example for `RagService.cs`:

```csharp
using System.Diagnostics;
using SecondBrain.API.Telemetry;

public class RagService : IRagService
{
    public async Task<RagResult> RetrieveContextAsync(
        string query,
        string userId,
        RagOptions options,
        CancellationToken cancellationToken = default)
    {
        using var activity = TelemetryConfiguration.RAGPipelineSource.StartActivity(
            "RAG.RetrieveContext",
            ActivityKind.Internal);

        activity?.SetTag("rag.query.length", query.Length);
        activity?.SetTag("rag.user_id", userId);
        activity?.SetTag("rag.hybrid_search", options.EnableHybridSearch);
        activity?.SetTag("rag.hyde", options.EnableHyDE);
        activity?.SetTag("rag.reranking", options.EnableReranking);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            TelemetryConfiguration.RAGQueriesTotal.Add(1);

            // 1. Query Expansion
            using (var expansionActivity = TelemetryConfiguration.RAGPipelineSource.StartActivity("RAG.QueryExpansion"))
            {
                // ... expansion logic
            }

            // 2. Vector Search
            using (var searchActivity = TelemetryConfiguration.RAGPipelineSource.StartActivity("RAG.VectorSearch"))
            {
                // ... search logic
            }

            // 3. Reranking
            using (var rerankActivity = TelemetryConfiguration.RAGPipelineSource.StartActivity("RAG.Reranking"))
            {
                // ... reranking logic
            }

            var result = new RagResult { /* ... */ };

            activity?.SetTag("rag.documents_retrieved", result.Documents.Count);
            activity?.SetTag("rag.avg_score", result.AverageScore);
            activity?.SetStatus(ActivityStatusCode.Ok);

            TelemetryConfiguration.RAGDocumentsRetrieved.Record(result.Documents.Count);

            return result;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
        finally
        {
            stopwatch.Stop();
            TelemetryConfiguration.RAGRetrievalDuration.Record(stopwatch.ElapsedMilliseconds);
        }
    }
}
```

### 1.6 Correlate Logs with Traces

Update Serilog configuration in `Program.cs`:

```csharp
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithSpan() // Adds trace_id and span_id to logs
    .Enrich.WithProperty("ServiceName", TelemetryConfiguration.ServiceName)
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} " +
        "{Properties:j}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/secondbrain-.log",
        rollingInterval: RollingInterval.Day,
        outputTemplate:
            "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] " +
            "[{TraceId}:{SpanId}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
```

### 1.7 Add OpenTelemetry Configuration to appsettings.json

```json
{
  "OpenTelemetry": {
    "OtlpEndpoint": "http://localhost:4317",
    "ExportToConsole": true,
    "ServiceName": "SecondBrain.API"
  }
}
```

### 1.8 Docker Compose for Observability Stack (Optional)

Add to `docker-compose.yml`:

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  prometheus:
    image: prom/prometheus:v2.50.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

---

## 2. HybridCache Implementation (High Priority)

HybridCache is a new .NET 9+ feature that provides a two-tier caching solution with stampede protection built-in.

### 2.1 Install Package

Add to `SecondBrain.Application.csproj`:

```xml
<PackageReference Include="Microsoft.Extensions.Caching.Hybrid" Version="9.0.0" />
```

### 2.2 Configure HybridCache

In `ServiceCollectionExtensions.cs`:

```csharp
// Replace AddMemoryCache with HybridCache
services.AddHybridCache(options =>
{
    options.MaximumPayloadBytes = 1024 * 1024; // 1MB max item size
    options.MaximumKeyLength = 256;
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(30),
        LocalCacheExpiration = TimeSpan.FromMinutes(5)
    };
});

// Optional: Add Redis as L2 cache
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
    options.InstanceName = "SecondBrain:";
});
```

### 2.3 Update CachedEmbeddingProvider

Replace `IMemoryCache` with `HybridCache`:

```csharp
using Microsoft.Extensions.Caching.Hybrid;

public class CachedEmbeddingProvider : IEmbeddingProvider
{
    private readonly IEmbeddingProvider _innerProvider;
    private readonly HybridCache _cache;
    private readonly ILogger<CachedEmbeddingProvider> _logger;

    public CachedEmbeddingProvider(
        IEmbeddingProvider innerProvider,
        HybridCache cache,
        ILogger<CachedEmbeddingProvider> logger)
    {
        _innerProvider = innerProvider;
        _cache = cache;
        _logger = logger;
    }

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"embedding:{ComputeHash(text)}";

        // HybridCache handles stampede protection automatically
        var result = await _cache.GetOrCreateAsync(
            cacheKey,
            async cancel =>
            {
                _logger.LogDebug("Cache miss for embedding, generating...");
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

    public async Task<IReadOnlyList<EmbeddingResponse>> GenerateBatchEmbeddingsAsync(
        IReadOnlyList<string> texts,
        CancellationToken cancellationToken = default)
    {
        var results = new List<EmbeddingResponse>(texts.Count);
        var uncachedTexts = new List<(int Index, string Text)>();

        // Check cache for each text
        for (int i = 0; i < texts.Count; i++)
        {
            var cacheKey = $"embedding:{ComputeHash(texts[i])}";
            var cached = await _cache.GetOrCreateAsync<EmbeddingResponse?>(
                cacheKey,
                _ => ValueTask.FromResult<EmbeddingResponse?>(null),
                cancellationToken: cancellationToken);

            if (cached != null)
            {
                results.Add(cached);
                TelemetryConfiguration.CacheHitsTotal.Add(1);
            }
            else
            {
                uncachedTexts.Add((i, texts[i]));
            }
        }

        // Generate uncached embeddings in batch
        if (uncachedTexts.Count > 0)
        {
            TelemetryConfiguration.CacheMissesTotal.Add(uncachedTexts.Count);

            var batchTexts = uncachedTexts.Select(x => x.Text).ToList();
            var newEmbeddings = await _innerProvider.GenerateBatchEmbeddingsAsync(
                batchTexts, cancellationToken);

            // Cache new embeddings
            for (int i = 0; i < uncachedTexts.Count; i++)
            {
                var cacheKey = $"embedding:{ComputeHash(uncachedTexts[i].Text)}";
                await _cache.SetAsync(cacheKey, newEmbeddings[i], cancellationToken: cancellationToken);
            }

            // Merge results in correct order
            foreach (var (index, _) in uncachedTexts.OrderBy(x => x.Index))
            {
                results.Insert(index, newEmbeddings[uncachedTexts.FindIndex(x => x.Index == index)]);
            }
        }

        return results;
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..32]; // First 16 bytes as hex
    }
}
```

### 2.4 Cache AI Model Responses (for non-streaming)

Create `CachedAIProvider.cs`:

```csharp
public class CachedAIProvider : IAIProvider
{
    private readonly IAIProvider _innerProvider;
    private readonly HybridCache _cache;

    public async Task<string> GenerateResponseAsync(
        string prompt,
        string model,
        double temperature,
        CancellationToken cancellationToken = default)
    {
        // Only cache deterministic responses (temperature = 0)
        if (temperature > 0)
        {
            return await _innerProvider.GenerateResponseAsync(
                prompt, model, temperature, cancellationToken);
        }

        var cacheKey = $"ai:{model}:{ComputeHash(prompt)}";

        return await _cache.GetOrCreateAsync(
            cacheKey,
            async cancel => await _innerProvider.GenerateResponseAsync(
                prompt, model, temperature, cancel),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromHours(1)
            },
            cancellationToken: cancellationToken);
    }

    // Streaming responses cannot be cached
    public IAsyncEnumerable<string> StreamResponseAsync(
        string prompt,
        string model,
        CancellationToken cancellationToken = default)
    {
        return _innerProvider.StreamResponseAsync(prompt, model, cancellationToken);
    }
}
```

---

## 3. Response Compression

Enable Brotli and GZip compression for API responses to reduce bandwidth by 20-70%.

### 3.1 Configure in Program.cs

```csharp
using System.IO.Compression;
using Microsoft.AspNetCore.ResponseCompression;

// Add compression services
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();

    // MIME types to compress
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "text/plain",
        "text/event-stream", // SSE responses
        "application/javascript",
        "text/css"
    });
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest; // Balance speed vs. ratio
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

// Add middleware (before routing)
app.UseResponseCompression();
```

### 3.2 SSE Streaming Considerations

For Server-Sent Events (chat streaming), ensure compression doesn't buffer:

```csharp
[HttpPost("{conversationId}/messages/stream")]
public async Task StreamMessages(string conversationId, [FromBody] SendMessageRequest request)
{
    Response.Headers.ContentType = "text/event-stream";
    Response.Headers.CacheControl = "no-cache";
    Response.Headers.Connection = "keep-alive";

    // Disable compression buffering for real-time streaming
    var compressionFeature = HttpContext.Features.Get<IHttpResponseBodyFeature>();
    compressionFeature?.DisableBuffering();

    // Stream responses...
}
```

---

## 4. Source-Generated JSON

Use compile-time JSON serialization for better performance and smaller memory footprint.

### 4.1 Create JSON Serializer Context

Create `backend/src/SecondBrain.API/Serialization/AppJsonContext.cs`:

```csharp
using System.Text.Json.Serialization;
using SecondBrain.Application.DTOs;

namespace SecondBrain.API.Serialization;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = false)]
[JsonSerializable(typeof(NoteResponse))]
[JsonSerializable(typeof(NoteResponse[]))]
[JsonSerializable(typeof(List<NoteResponse>))]
[JsonSerializable(typeof(CreateNoteRequest))]
[JsonSerializable(typeof(UpdateNoteRequest))]
[JsonSerializable(typeof(ChatConversationResponse))]
[JsonSerializable(typeof(ChatConversationResponse[]))]
[JsonSerializable(typeof(ChatMessageResponse))]
[JsonSerializable(typeof(ChatMessageResponse[]))]
[JsonSerializable(typeof(SendMessageRequest))]
[JsonSerializable(typeof(RagContextNoteDto))]
[JsonSerializable(typeof(RagContextNoteDto[]))]
[JsonSerializable(typeof(AIProviderHealthDto))]
[JsonSerializable(typeof(AIProviderHealthDto[]))]
[JsonSerializable(typeof(IndexingStatsResponse))]
[JsonSerializable(typeof(RagAnalyticsResponse))]
[JsonSerializable(typeof(AIUsageStatsResponse))]
[JsonSerializable(typeof(ErrorResponse))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSerializable(typeof(Dictionary<string, object>))]
[JsonSerializable(typeof(Dictionary<string, string>))]
public partial class AppJsonContext : JsonSerializerContext
{
}
```

### 4.2 Configure Controllers to Use Generated Context

In `Program.cs`:

```csharp
using SecondBrain.API.Serialization;

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
```

### 4.3 Use in Manual Serialization

```csharp
// Instead of:
var json = JsonSerializer.Serialize(response);

// Use:
var json = JsonSerializer.Serialize(response, AppJsonContext.Default.NoteResponse);

// For SSE events:
await Response.WriteAsync(
    $"data: {JsonSerializer.Serialize(data, AppJsonContext.Default.ChatMessageResponse)}\n\n");
```

---

## 5. Output Caching

Cache expensive read endpoints at the HTTP level.

### 5.1 Configure Output Caching

In `Program.cs`:

```csharp
builder.Services.AddOutputCache(options =>
{
    // Default policy
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(1)));

    // Named policies
    options.AddPolicy("AIHealth", builder =>
        builder.Expire(TimeSpan.FromSeconds(30))
               .Tag("ai-health"));

    options.AddPolicy("Stats", builder =>
        builder.Expire(TimeSpan.FromMinutes(5))
               .SetVaryByQuery("userId")
               .Tag("stats"));

    options.AddPolicy("UserNotes", builder =>
        builder.Expire(TimeSpan.FromMinutes(2))
               .SetVaryByQuery("folder", "includeArchived")
               .SetVaryByRouteValue("userId")
               .Tag("notes"));

    options.AddPolicy("RagAnalytics", builder =>
        builder.Expire(TimeSpan.FromMinutes(10))
               .Tag("rag-analytics"));
});

// Add middleware after routing
app.UseOutputCache();
```

### 5.2 Apply to Endpoints

```csharp
[HttpGet]
[OutputCache(PolicyName = "UserNotes")]
public async Task<ActionResult<IEnumerable<NoteResponse>>> GetNotes(
    [FromQuery] string? folder = null,
    [FromQuery] bool includeArchived = false)
{
    // ...
}

[HttpGet("health")]
[OutputCache(PolicyName = "AIHealth")]
public async Task<ActionResult<IEnumerable<AIProviderHealthDto>>> GetAIHealth()
{
    // ...
}

[HttpGet("analytics/stats")]
[OutputCache(PolicyName = "RagAnalytics")]
public async Task<ActionResult<RagAnalyticsResponse>> GetRagStats()
{
    // ...
}
```

### 5.3 Cache Invalidation

Create `ICacheInvalidator` service:

```csharp
public interface ICacheInvalidator
{
    Task InvalidateNotesAsync(string userId);
    Task InvalidateStatsAsync();
    Task InvalidateRagAnalyticsAsync();
}

public class OutputCacheInvalidator : ICacheInvalidator
{
    private readonly IOutputCacheStore _store;

    public OutputCacheInvalidator(IOutputCacheStore store)
    {
        _store = store;
    }

    public async Task InvalidateNotesAsync(string userId)
    {
        await _store.EvictByTagAsync("notes", CancellationToken.None);
    }

    public async Task InvalidateStatsAsync()
    {
        await _store.EvictByTagAsync("stats", CancellationToken.None);
    }

    public async Task InvalidateRagAnalyticsAsync()
    {
        await _store.EvictByTagAsync("rag-analytics", CancellationToken.None);
    }
}
```

Use in mutation handlers:

```csharp
public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    private readonly ICacheInvalidator _cacheInvalidator;

    public async Task<Result<NoteResponse>> Handle(CreateNoteCommand request, CancellationToken ct)
    {
        var note = await _repository.CreateAsync(/* ... */);

        // Invalidate cached notes
        await _cacheInvalidator.InvalidateNotesAsync(request.UserId);

        return Result<NoteResponse>.Success(note.ToResponse());
    }
}
```

---

## 6. Memory Optimizations

### 6.1 ArrayPool for Temporary Buffers

Use `ArrayPool<T>` instead of allocating new arrays:

```csharp
using System.Buffers;

public class EmbeddingService
{
    public async Task<float[]> ProcessEmbeddingAsync(ReadOnlyMemory<byte> data)
    {
        // Rent a buffer from the pool
        var buffer = ArrayPool<float>.Shared.Rent(1536);

        try
        {
            // Use the buffer...
            ProcessIntoBuffer(data.Span, buffer);

            // Copy only what we need
            return buffer[..1536].ToArray();
        }
        finally
        {
            // Return to pool
            ArrayPool<float>.Shared.Return(buffer, clearArray: true);
        }
    }
}
```

### 6.2 Span<T> for String Operations

Use `Span<char>` and `ReadOnlySpan<char>` for string parsing:

```csharp
public class QueryParser
{
    public static (string Query, Dictionary<string, string> Filters) ParseSearchQuery(
        ReadOnlySpan<char> input)
    {
        var filters = new Dictionary<string, string>();
        var queryBuilder = new StringBuilder();

        foreach (var segment in input.Split(' '))
        {
            var token = input[segment];

            var colonIndex = token.IndexOf(':');
            if (colonIndex > 0)
            {
                var key = token[..colonIndex].ToString();
                var value = token[(colonIndex + 1)..].ToString();
                filters[key] = value;
            }
            else
            {
                if (queryBuilder.Length > 0) queryBuilder.Append(' ');
                queryBuilder.Append(token);
            }
        }

        return (queryBuilder.ToString(), filters);
    }
}
```

### 6.3 Memory<T> for Async Operations

```csharp
public class ChunkProcessor
{
    public async Task ProcessChunksAsync(
        Memory<byte> data,
        int chunkSize,
        CancellationToken cancellationToken)
    {
        var position = 0;

        while (position < data.Length)
        {
            var remaining = data.Length - position;
            var currentChunkSize = Math.Min(chunkSize, remaining);

            // Slice without allocation
            var chunk = data.Slice(position, currentChunkSize);

            await ProcessChunkAsync(chunk, cancellationToken);

            position += currentChunkSize;
        }
    }
}
```

### 6.4 StringBuilder Pooling

For frequent string building operations:

```csharp
using Microsoft.Extensions.ObjectPool;

public class PromptBuilder
{
    private readonly ObjectPool<StringBuilder> _stringBuilderPool;

    public PromptBuilder(ObjectPoolProvider poolProvider)
    {
        _stringBuilderPool = poolProvider.CreateStringBuilderPool();
    }

    public string BuildSystemPrompt(IEnumerable<string> contextDocs)
    {
        var sb = _stringBuilderPool.Get();

        try
        {
            sb.AppendLine("You are a helpful assistant with access to the following context:");
            sb.AppendLine();

            foreach (var doc in contextDocs)
            {
                sb.AppendLine("---");
                sb.AppendLine(doc);
            }

            return sb.ToString();
        }
        finally
        {
            _stringBuilderPool.Return(sb);
        }
    }
}

// Register in DI
services.AddSingleton<ObjectPoolProvider, DefaultObjectPoolProvider>();
services.AddSingleton<PromptBuilder>();
```

---

## 7. EF Core Optimizations

### 7.1 Compiled Queries

Create compiled queries for hot paths:

```csharp
public class NoteRepository : INoteRepository
{
    // Compiled query for frequently used operations
    private static readonly Func<ApplicationDbContext, string, IAsyncEnumerable<Note>>
        GetUserNotesQuery = EF.CompileAsyncQuery(
            (ApplicationDbContext ctx, string userId) =>
                ctx.Notes
                    .AsNoTracking()
                    .Where(n => n.UserId == userId && !n.IsDeleted)
                    .OrderByDescending(n => n.UpdatedAt));

    private static readonly Func<ApplicationDbContext, string, string, Task<Note?>>
        GetNoteByIdQuery = EF.CompileAsyncQuery(
            (ApplicationDbContext ctx, string noteId, string userId) =>
                ctx.Notes
                    .AsNoTracking()
                    .FirstOrDefault(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted));

    public async IAsyncEnumerable<Note> GetAllByUserAsync(
        string userId,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        await foreach (var note in GetUserNotesQuery(_context, userId)
            .WithCancellation(cancellationToken))
        {
            yield return note;
        }
    }

    public Task<Note?> GetByIdAsync(string id, string userId)
    {
        return GetNoteByIdQuery(_context, id, userId);
    }
}
```

### 7.2 Split Queries for Complex Includes

```csharp
// Instead of a single query with multiple includes
var conversations = await _context.ChatConversations
    .Include(c => c.Messages)
        .ThenInclude(m => m.ToolCalls)
    .Include(c => c.Messages)
        .ThenInclude(m => m.RetrievedNotes)
    .Include(c => c.Messages)
        .ThenInclude(m => m.GeneratedImages)
    .AsSplitQuery() // Split into multiple SQL queries
    .ToListAsync(cancellationToken);
```

### 7.3 Projection for Read Operations

```csharp
// Don't fetch entire entities for display
public async Task<IEnumerable<NoteListItemDto>> GetNoteListAsync(
    string userId,
    CancellationToken cancellationToken)
{
    return await _context.Notes
        .AsNoTracking()
        .Where(n => n.UserId == userId && !n.IsDeleted)
        .Select(n => new NoteListItemDto
        {
            Id = n.Id,
            Title = n.Title,
            Tags = n.Tags,
            UpdatedAt = n.UpdatedAt,
            IsArchived = n.IsArchived,
            Folder = n.Folder
            // Exclude Content - not needed for list view
        })
        .ToListAsync(cancellationToken);
}
```

### 7.4 Connection Pooling Configuration

In `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=secondbrain;Username=postgres;Password=...;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=100;Connection Idle Lifetime=300;Connection Pruning Interval=10"
  }
}
```

### 7.5 Batch Operations

Use EF Core bulk extensions for large operations:

```csharp
// For bulk delete (more efficient than looping)
public async Task<int> BulkDeleteAsync(
    string userId,
    IEnumerable<string> noteIds,
    CancellationToken cancellationToken)
{
    return await _context.Notes
        .Where(n => noteIds.Contains(n.Id) && n.UserId == userId)
        .ExecuteUpdateAsync(
            setters => setters
                .SetProperty(n => n.IsDeleted, true)
                .SetProperty(n => n.DeletedAt, DateTime.UtcNow)
                .SetProperty(n => n.DeletedBy, userId),
            cancellationToken);
}
```

---

## 8. Health Check Enhancements

### 8.1 AI Provider Health Checks

Create `backend/src/SecondBrain.API/HealthChecks/AIProviderHealthCheck.cs`:

```csharp
using Microsoft.Extensions.Diagnostics.HealthChecks;

public class AIProviderHealthCheck : IHealthCheck
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly AIProviderCircuitBreaker _circuitBreaker;
    private readonly ILogger<AIProviderHealthCheck> _logger;

    public AIProviderHealthCheck(
        IAIProviderFactory providerFactory,
        AIProviderCircuitBreaker circuitBreaker,
        ILogger<AIProviderHealthCheck> logger)
    {
        _providerFactory = providerFactory;
        _circuitBreaker = circuitBreaker;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var providerStatuses = new Dictionary<string, object>();
        var unhealthyProviders = new List<string>();

        foreach (var provider in _providerFactory.GetAllProviders())
        {
            var circuitState = _circuitBreaker.GetState(provider.Name);

            var status = new
            {
                CircuitState = circuitState.ToString(),
                IsHealthy = circuitState != CircuitBreakerState.Open
            };

            providerStatuses[provider.Name] = status;

            if (circuitState == CircuitBreakerState.Open)
            {
                unhealthyProviders.Add(provider.Name);
            }
        }

        if (unhealthyProviders.Count == _providerFactory.GetAllProviders().Count())
        {
            return HealthCheckResult.Unhealthy(
                "All AI providers are unavailable",
                data: providerStatuses);
        }

        if (unhealthyProviders.Count > 0)
        {
            return HealthCheckResult.Degraded(
                $"Some AI providers unavailable: {string.Join(", ", unhealthyProviders)}",
                data: providerStatuses);
        }

        return HealthCheckResult.Healthy(
            "All AI providers healthy",
            data: providerStatuses);
    }
}
```

### 8.2 Vector Store Health Check

```csharp
public class VectorStoreHealthCheck : IHealthCheck
{
    private readonly IVectorStore _vectorStore;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Perform a lightweight query
            var result = await _vectorStore.SearchAsync(
                new float[1536], // Dummy embedding
                limit: 1,
                cancellationToken: cancellationToken);

            return HealthCheckResult.Healthy("Vector store is accessible");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy(
                "Vector store is not accessible",
                exception: ex);
        }
    }
}
```

### 8.3 Register Health Checks

In `Program.cs`:

```csharp
builder.Services.AddHealthChecks()
    // Database
    .AddCheck<PostgresHealthCheck>("postgresql",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "ready" })

    // AI Providers
    .AddCheck<AIProviderHealthCheck>("ai-providers",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "ai", "ready" })

    // Vector Store
    .AddCheck<VectorStoreHealthCheck>("vector-store",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "vectorstore", "ready" })

    // Memory pressure
    .AddCheck("memory", () =>
    {
        var allocated = GC.GetTotalMemory(forceFullCollection: false);
        var threshold = 1024L * 1024 * 1024; // 1GB

        return allocated < threshold
            ? HealthCheckResult.Healthy($"Memory: {allocated / 1024 / 1024}MB")
            : HealthCheckResult.Degraded($"High memory: {allocated / 1024 / 1024}MB");
    }, tags: new[] { "memory", "live" });

// Map endpoints with different filters
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteDetailedResponse
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live"),
    ResponseWriter = WriteDetailedResponse
});

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = WriteDetailedResponse
});

static Task WriteDetailedResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";

    var response = new
    {
        status = report.Status.ToString(),
        duration = report.TotalDuration.TotalMilliseconds,
        checks = report.Entries.Select(e => new
        {
            name = e.Key,
            status = e.Value.Status.ToString(),
            duration = e.Value.Duration.TotalMilliseconds,
            description = e.Value.Description,
            data = e.Value.Data,
            exception = e.Value.Exception?.Message
        })
    };

    return context.Response.WriteAsJsonAsync(response, AppJsonContext.Default.HealthCheckResponse);
}
```

### 8.4 Health Check Publisher (for Alerting)

```csharp
public class HealthCheckPublisher : IHealthCheckPublisher
{
    private readonly ILogger<HealthCheckPublisher> _logger;
    private readonly TelemetryConfiguration _telemetry;

    public Task PublishAsync(HealthReport report, CancellationToken cancellationToken)
    {
        foreach (var entry in report.Entries)
        {
            TelemetryConfiguration.HealthCheckGauge.Record(
                entry.Value.Status == HealthStatus.Healthy ? 1 :
                entry.Value.Status == HealthStatus.Degraded ? 0.5 : 0,
                new KeyValuePair<string, object?>("check_name", entry.Key));

            if (entry.Value.Status != HealthStatus.Healthy)
            {
                _logger.LogWarning(
                    "Health check {CheckName} is {Status}: {Description}",
                    entry.Key,
                    entry.Value.Status,
                    entry.Value.Description);
            }
        }

        return Task.CompletedTask;
    }
}

// Register
services.Configure<HealthCheckPublisherOptions>(options =>
{
    options.Delay = TimeSpan.FromSeconds(5);
    options.Period = TimeSpan.FromSeconds(30);
});
services.AddSingleton<IHealthCheckPublisher, HealthCheckPublisher>();
```

---

## 9. Problem Details Middleware

Implement RFC 9457 compliant error responses.

### 9.1 Configure Problem Details

In `Program.cs`:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance = context.HttpContext.Request.Path;

        // Add trace ID for debugging
        context.ProblemDetails.Extensions["traceId"] =
            Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;

        // Add timestamp
        context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
    };
});
```

### 9.2 Update GlobalExceptionMiddleware

```csharp
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IProblemDetailsService _problemDetailsService;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IProblemDetailsService problemDetailsService)
    {
        _next = next;
        _logger = logger;
        _problemDetailsService = problemDetailsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail) = exception switch
        {
            NotFoundException => (404, "Resource Not Found", exception.Message),
            UnauthorizedException => (401, "Unauthorized", exception.Message),
            ValidationException ve => (400, "Validation Failed", ve.Message),
            CircuitBreakerOpenException => (503, "Service Unavailable",
                "The AI provider is temporarily unavailable. Please try again later."),
            _ => (500, "Internal Server Error",
                "An unexpected error occurred. Please try again later.")
        };

        _logger.LogError(exception,
            "Unhandled exception: {ExceptionType} - {Message}",
            exception.GetType().Name,
            exception.Message);

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.io/{statusCode}",
            Instance = context.Request.Path
        };

        // Add validation errors if applicable
        if (exception is ValidationException validationEx)
        {
            problemDetails.Extensions["errors"] = validationEx.Errors;
        }

        // Add stack trace in development
        if (context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
        {
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
            problemDetails.Extensions["innerException"] = exception.InnerException?.Message;
        }

        await _problemDetailsService.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problemDetails
        });
    }
}
```

### 9.3 Custom Exception Types

Ensure all custom exceptions map to appropriate status codes:

```csharp
public abstract class DomainException : Exception
{
    public abstract int StatusCode { get; }
    public abstract string ErrorCode { get; }

    protected DomainException(string message) : base(message) { }
}

public class NotFoundException : DomainException
{
    public override int StatusCode => 404;
    public override string ErrorCode => "RESOURCE_NOT_FOUND";

    public NotFoundException(string resource, string id)
        : base($"{resource} with ID '{id}' was not found.") { }
}

public class UnauthorizedException : DomainException
{
    public override int StatusCode => 401;
    public override string ErrorCode => "UNAUTHORIZED";

    public UnauthorizedException(string message = "You are not authorized to perform this action.")
        : base(message) { }
}

public class ValidationException : DomainException
{
    public override int StatusCode => 400;
    public override string ErrorCode => "VALIDATION_FAILED";

    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }
}
```

---

## 10. Testing Improvements

### 10.1 TimeProvider Abstraction

.NET 8+ includes `TimeProvider` for time-based testing.

#### Configure in DI

```csharp
// Program.cs
builder.Services.AddSingleton(TimeProvider.System);
```

#### Use in Services

```csharp
public class TokenService
{
    private readonly TimeProvider _timeProvider;
    private readonly JwtSettings _settings;

    public TokenService(TimeProvider timeProvider, IOptions<JwtSettings> settings)
    {
        _timeProvider = timeProvider;
        _settings = settings.Value;
    }

    public string GenerateToken(User user)
    {
        var now = _timeProvider.GetUtcNow();
        var expires = now.Add(_settings.TokenLifetime);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Iat, now.ToUnixTimeSeconds().ToString()),
            new Claim(JwtRegisteredClaimNames.Exp, expires.ToUnixTimeSeconds().ToString())
        };

        // Generate token...
    }

    public bool IsTokenExpired(string token)
    {
        var expClaim = GetClaimValue(token, JwtRegisteredClaimNames.Exp);
        var expTime = DateTimeOffset.FromUnixTimeSeconds(long.Parse(expClaim));

        return _timeProvider.GetUtcNow() >= expTime;
    }
}
```

### 10.2 FakeTimeProvider for Unit Tests

```csharp
using Microsoft.Extensions.Time.Testing;

public class TokenServiceTests
{
    [Fact]
    public void GenerateToken_SetsCorrectExpiration()
    {
        // Arrange
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero));
        var settings = Options.Create(new JwtSettings { TokenLifetime = TimeSpan.FromHours(1) });
        var service = new TokenService(fakeTime, settings);
        var user = new User { Id = "user-1", Email = "test@example.com" };

        // Act
        var token = service.GenerateToken(user);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        Assert.Equal(new DateTime(2024, 1, 1, 13, 0, 0), jwtToken.ValidTo);
    }

    [Fact]
    public void IsTokenExpired_ReturnsFalse_WhenTokenIsValid()
    {
        // Arrange
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero));
        var service = new TokenService(fakeTime, /* ... */);
        var token = CreateTokenExpiringAt(new DateTime(2024, 1, 1, 13, 0, 0));

        // Act - advance time by 30 minutes
        fakeTime.Advance(TimeSpan.FromMinutes(30));
        var isExpired = service.IsTokenExpired(token);

        // Assert
        Assert.False(isExpired);
    }

    [Fact]
    public void IsTokenExpired_ReturnsTrue_WhenTokenHasExpired()
    {
        // Arrange
        var fakeTime = new FakeTimeProvider(new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero));
        var service = new TokenService(fakeTime, /* ... */);
        var token = CreateTokenExpiringAt(new DateTime(2024, 1, 1, 13, 0, 0));

        // Act - advance time by 2 hours
        fakeTime.Advance(TimeSpan.FromHours(2));
        var isExpired = service.IsTokenExpired(token);

        // Assert
        Assert.True(isExpired);
    }
}
```

### 10.3 Integration Testing with WebApplicationFactory

Create `backend/tests/SecondBrain.Tests.Integration/CustomWebApplicationFactory.cs`:

```csharp
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public FakeTimeProvider FakeTimeProvider { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace TimeProvider with fake
            services.AddSingleton<TimeProvider>(FakeTimeProvider);

            // Replace database with test container
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseNpgsql(TestDatabase.ConnectionString);
            });

            // Replace external AI services with mocks
            services.RemoveAll<IAIProviderFactory>();
            services.AddSingleton<IAIProviderFactory, MockAIProviderFactory>();
        });
    }
}
```

### 10.4 Performance Testing with BenchmarkDotNet

Create `backend/benchmarks/SecondBrain.Benchmarks/EmbeddingBenchmarks.cs`:

```csharp
using BenchmarkDotNet.Attributes;

[MemoryDiagnoser]
[SimpleJob(warmupCount: 3, iterationCount: 10)]
public class EmbeddingBenchmarks
{
    private CachedEmbeddingProvider _cachedProvider;
    private string[] _testTexts;

    [GlobalSetup]
    public void Setup()
    {
        var cache = new HybridCache(/* ... */);
        var innerProvider = new MockEmbeddingProvider();
        _cachedProvider = new CachedEmbeddingProvider(innerProvider, cache, /* ... */);

        _testTexts = Enumerable.Range(0, 100)
            .Select(i => $"Test document number {i} with some content")
            .ToArray();
    }

    [Benchmark(Baseline = true)]
    public async Task SingleEmbedding()
    {
        await _cachedProvider.GenerateEmbeddingAsync(_testTexts[0]);
    }

    [Benchmark]
    [Arguments(10)]
    [Arguments(50)]
    [Arguments(100)]
    public async Task BatchEmbeddings(int count)
    {
        await _cachedProvider.GenerateBatchEmbeddingsAsync(_testTexts.Take(count).ToList());
    }

    [Benchmark]
    public async Task CachedEmbedding()
    {
        // Second call should hit cache
        await _cachedProvider.GenerateEmbeddingAsync(_testTexts[0]);
        await _cachedProvider.GenerateEmbeddingAsync(_testTexts[0]);
    }
}
```

---

## Implementation Checklist

### Phase 1: High Priority (Week 1-2)

- [ ] **OpenTelemetry Integration**
  - [ ] Install packages
  - [ ] Create `TelemetryConfiguration.cs`
  - [ ] Configure tracing in `Program.cs`
  - [ ] Instrument AI providers
  - [ ] Instrument RAG pipeline
  - [ ] Add Serilog span enricher
  - [ ] Set up Jaeger/OTLP export

- [ ] **HybridCache Implementation**
  - [ ] Install `Microsoft.Extensions.Caching.Hybrid`
  - [ ] Replace `IMemoryCache` in `ServiceCollectionExtensions.cs`
  - [ ] Update `CachedEmbeddingProvider`
  - [ ] Add Redis L2 cache (optional)

### Phase 2: Medium Priority (Week 3-4)

- [ ] **Response Compression**
  - [ ] Add compression middleware
  - [ ] Configure for SSE streaming

- [ ] **Source-Generated JSON**
  - [ ] Create `AppJsonContext.cs`
  - [ ] Update controller JSON options
  - [ ] Migrate SSE serialization

- [ ] **Output Caching**
  - [ ] Configure cache policies
  - [ ] Add to read endpoints
  - [ ] Implement cache invalidation

- [ ] **EF Core Optimizations**
  - [ ] Add compiled queries for hot paths
  - [ ] Configure split queries
  - [ ] Optimize projections
  - [ ] Tune connection pooling

### Phase 3: Low Priority (Week 5-6)

- [ ] **Memory Optimizations**
  - [ ] Add `ArrayPool<T>` usage
  - [ ] Refactor string operations with `Span<T>`
  - [ ] Add `StringBuilder` pooling

- [ ] **Health Check Enhancements**
  - [ ] Create AI provider health check
  - [ ] Create vector store health check
  - [ ] Configure readiness vs liveness probes
  - [ ] Add health check publisher

- [ ] **Problem Details Middleware**
  - [ ] Configure `AddProblemDetails`
  - [ ] Update `GlobalExceptionMiddleware`

- [ ] **Testing Improvements**
  - [ ] Add `TimeProvider` to DI
  - [ ] Create `FakeTimeProvider` tests
  - [ ] Update integration test factory
  - [ ] Add performance benchmarks

---

## Configuration Reference

### appsettings.json Additions

```json
{
  "OpenTelemetry": {
    "OtlpEndpoint": "http://localhost:4317",
    "ExportToConsole": false,
    "ServiceName": "SecondBrain.API"
  },
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
  },
  "HealthChecks": {
    "PublishInterval": "00:00:30",
    "InitialDelay": "00:00:05"
  }
}
```

### Environment Variables

```bash
# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
OTEL_SERVICE_NAME=SecondBrain.API

# Redis (for HybridCache L2)
REDIS_CONNECTION_STRING=redis:6379

# PostgreSQL Connection Pool
POSTGRES_MIN_POOL_SIZE=5
POSTGRES_MAX_POOL_SIZE=100
```

---

## Performance Monitoring Queries

### PostgreSQL Performance

```sql
-- Top 10 slowest queries
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Cache hit ratio
SELECT 
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS cache_ratio
FROM pg_statio_user_tables;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Application Metrics (Prometheus Queries)

```promql
# AI request rate by provider
rate(ai_requests_total[5m])

# AI error rate
rate(ai_errors_total[5m]) / rate(ai_requests_total[5m])

# RAG retrieval latency (p95)
histogram_quantile(0.95, rate(rag_retrieval_duration_ms_bucket[5m]))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) / 
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Circuit breaker state
circuit_breaker_state
```

---

## Summary

This guide provides a comprehensive roadmap for enhancing the Second Brain backend with modern .NET 10 features and performance optimizations. The implementation is designed to be incremental, with high-priority items (OpenTelemetry, HybridCache) providing immediate value for debugging and performance.

**Key Benefits:**

| Enhancement | Benefit |
|-------------|---------|
| OpenTelemetry | Distributed tracing, AI pipeline visibility |
| HybridCache | 90%+ cache hit rate, stampede protection |
| Response Compression | 20-70% bandwidth reduction |
| Source-Generated JSON | Faster serialization, lower allocations |
| Output Caching | Reduced compute for read endpoints |
| EF Core Optimizations | Faster queries, less memory |
| Health Checks | Better operational visibility |
| Problem Details | Consistent error responses |
| TimeProvider | Deterministic time-based testing |

**Next Steps:**

1. Start with OpenTelemetry to gain visibility into current performance
2. Implement HybridCache to reduce AI API costs
3. Add response compression for bandwidth savings
4. Gradually implement remaining optimizations based on observed bottlenecks
