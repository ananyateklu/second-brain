using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace SecondBrain.Application.Telemetry;

/// <summary>
/// Telemetry utilities for the Application layer.
/// Activity sources and meters defined here are registered with OpenTelemetry in the API layer.
/// </summary>
public static class ApplicationTelemetry
{
    public const string ServiceName = "SecondBrain.API";
    public const string ServiceVersion = "1.0.0";

    // Activity Sources for Tracing - these names must match what's registered in OpenTelemetry
    public static readonly ActivitySource AIProviderSource = new("SecondBrain.AIProvider");
    public static readonly ActivitySource RAGPipelineSource = new("SecondBrain.RAGPipeline");
    public static readonly ActivitySource AgentSource = new("SecondBrain.Agent");
    public static readonly ActivitySource EmbeddingSource = new("SecondBrain.Embedding");
    public static readonly ActivitySource ChatSource = new("SecondBrain.Chat");

    // Meters for Metrics
    public static readonly Meter AIMetrics = new("SecondBrain.AI", ServiceVersion);
    public static readonly Meter RAGMetrics = new("SecondBrain.RAG", ServiceVersion);
    public static readonly Meter CacheMetrics = new("SecondBrain.Cache", ServiceVersion);

    // AI Provider Counters
    public static readonly Counter<long> AIRequestsTotal = AIMetrics.CreateCounter<long>(
        "ai_requests_total",
        description: "Total number of AI provider requests");

    public static readonly Counter<long> AIErrorsTotal = AIMetrics.CreateCounter<long>(
        "ai_errors_total",
        description: "Total number of AI provider errors");

    public static readonly Counter<long> AITokensUsed = AIMetrics.CreateCounter<long>(
        "ai_tokens_used_total",
        description: "Total number of tokens used across AI providers");

    // RAG Counters
    public static readonly Counter<long> RAGQueriesTotal = RAGMetrics.CreateCounter<long>(
        "rag_queries_total",
        description: "Total number of RAG queries");

    public static readonly Counter<long> RAGRetrievedDocuments = RAGMetrics.CreateCounter<long>(
        "rag_retrieved_documents_total",
        description: "Total number of documents retrieved via RAG");

    // Cache Counters
    public static readonly Counter<long> CacheHitsTotal = CacheMetrics.CreateCounter<long>(
        "cache_hits_total",
        description: "Total embedding cache hits");

    public static readonly Counter<long> CacheMissesTotal = CacheMetrics.CreateCounter<long>(
        "cache_misses_total",
        description: "Total embedding cache misses");

    // AI Response Histograms
    public static readonly Histogram<double> AIResponseDuration = AIMetrics.CreateHistogram<double>(
        "ai_response_duration_ms",
        unit: "ms",
        description: "AI provider response duration in milliseconds");

    public static readonly Histogram<double> AIStreamingFirstTokenDuration = AIMetrics.CreateHistogram<double>(
        "ai_streaming_first_token_duration_ms",
        unit: "ms",
        description: "Time to first token in streaming responses");

    // RAG Histograms
    public static readonly Histogram<double> RAGRetrievalDuration = RAGMetrics.CreateHistogram<double>(
        "rag_retrieval_duration_ms",
        unit: "ms",
        description: "RAG retrieval duration in milliseconds");

    public static readonly Histogram<double> RAGQueryExpansionDuration = RAGMetrics.CreateHistogram<double>(
        "rag_query_expansion_duration_ms",
        unit: "ms",
        description: "RAG query expansion (HyDE/multi-query) duration in milliseconds");

    public static readonly Histogram<double> RAGVectorSearchDuration = RAGMetrics.CreateHistogram<double>(
        "rag_vector_search_duration_ms",
        unit: "ms",
        description: "RAG vector search duration in milliseconds");

    public static readonly Histogram<double> RAGBM25SearchDuration = RAGMetrics.CreateHistogram<double>(
        "rag_bm25_search_duration_ms",
        unit: "ms",
        description: "RAG BM25 search duration in milliseconds");

    public static readonly Histogram<double> RAGRerankDuration = RAGMetrics.CreateHistogram<double>(
        "rag_rerank_duration_ms",
        unit: "ms",
        description: "RAG reranking duration in milliseconds");

    public static readonly Histogram<int> RAGDocumentsRetrieved = RAGMetrics.CreateHistogram<int>(
        "rag_documents_retrieved",
        description: "Number of documents retrieved per RAG query");

    public static readonly Histogram<double> RAGRelevanceScore = RAGMetrics.CreateHistogram<double>(
        "rag_relevance_score",
        description: "Average relevance score of retrieved documents");

    // Embedding Histograms
    public static readonly Histogram<double> EmbeddingGenerationDuration = AIMetrics.CreateHistogram<double>(
        "embedding_generation_duration_ms",
        unit: "ms",
        description: "Embedding generation duration in milliseconds");

    public static readonly Histogram<int> EmbeddingBatchSize = AIMetrics.CreateHistogram<int>(
        "embedding_batch_size",
        description: "Number of texts in embedding batch requests");

    // Helper methods for creating activities with common tags
    public static Activity? StartAIProviderActivity(string operation, string provider, string? model = null)
    {
        var activity = AIProviderSource.StartActivity(operation, ActivityKind.Client);
        activity?.SetTag("ai.provider", provider);
        if (model != null) activity?.SetTag("ai.model", model);
        return activity;
    }

    public static Activity? StartRAGActivity(string operation, string? userId = null)
    {
        var activity = RAGPipelineSource.StartActivity(operation, ActivityKind.Internal);
        if (userId != null) activity?.SetTag("user.id", userId);
        return activity;
    }

    public static Activity? StartEmbeddingActivity(string operation, string provider)
    {
        var activity = EmbeddingSource.StartActivity(operation, ActivityKind.Client);
        activity?.SetTag("embedding.provider", provider);
        return activity;
    }

    public static Activity? StartAgentActivity(string operation, string? conversationId = null)
    {
        var activity = AgentSource.StartActivity(operation, ActivityKind.Internal);
        if (conversationId != null) activity?.SetTag("conversation.id", conversationId);
        return activity;
    }

    public static Activity? StartChatActivity(string operation, string? conversationId = null)
    {
        var activity = ChatSource.StartActivity(operation, ActivityKind.Internal);
        if (conversationId != null) activity?.SetTag("conversation.id", conversationId);
        return activity;
    }

    // Helper to record exception on activity
    public static void RecordException(this Activity? activity, Exception ex)
    {
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        activity?.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
        {
            { "exception.type", ex.GetType().FullName },
            { "exception.message", ex.Message },
            { "exception.stacktrace", ex.StackTrace }
        }));
    }

    // Helper to add standard AI metrics
    public static void RecordAIRequest(string provider, string model, double durationMs, bool success, int tokensUsed = 0)
    {
        var tags = new TagList
        {
            { "provider", provider },
            { "model", model },
            { "success", success.ToString().ToLowerInvariant() }
        };

        AIRequestsTotal.Add(1, tags);
        AIResponseDuration.Record(durationMs, tags);

        if (tokensUsed > 0)
        {
            AITokensUsed.Add(tokensUsed, tags);
        }

        if (!success)
        {
            AIErrorsTotal.Add(1, tags);
        }
    }

    // Helper to add RAG metrics
    public static void RecordRAGQuery(
        int documentsRetrieved,
        double totalDurationMs,
        double? vectorSearchMs = null,
        double? bm25SearchMs = null,
        double? rerankMs = null,
        double? avgRelevanceScore = null,
        bool hybridEnabled = false,
        bool hydeEnabled = false,
        bool rerankEnabled = false)
    {
        var tags = new TagList
        {
            { "hybrid_search", hybridEnabled.ToString().ToLowerInvariant() },
            { "hyde", hydeEnabled.ToString().ToLowerInvariant() },
            { "reranking", rerankEnabled.ToString().ToLowerInvariant() }
        };

        RAGQueriesTotal.Add(1, tags);
        RAGRetrievalDuration.Record(totalDurationMs, tags);
        RAGDocumentsRetrieved.Record(documentsRetrieved, tags);
        RAGRetrievedDocuments.Add(documentsRetrieved, tags);

        if (vectorSearchMs.HasValue)
            RAGVectorSearchDuration.Record(vectorSearchMs.Value, tags);

        if (bm25SearchMs.HasValue)
            RAGBM25SearchDuration.Record(bm25SearchMs.Value, tags);

        if (rerankMs.HasValue)
            RAGRerankDuration.Record(rerankMs.Value, tags);

        if (avgRelevanceScore.HasValue)
            RAGRelevanceScore.Record(avgRelevanceScore.Value, tags);
    }

    // Helper to record cache metrics
    public static void RecordCacheHit(string cacheType = "embedding")
    {
        CacheHitsTotal.Add(1, new TagList { { "cache_type", cacheType } });
    }

    public static void RecordCacheMiss(string cacheType = "embedding")
    {
        CacheMissesTotal.Add(1, new TagList { { "cache_type", cacheType } });
    }

    // Helper to record embedding metrics
    public static void RecordEmbeddingGeneration(string provider, double durationMs, int batchSize = 1)
    {
        var tags = new TagList { { "provider", provider } };
        EmbeddingGenerationDuration.Record(durationMs, tags);
        EmbeddingBatchSize.Record(batchSize, tags);
    }
}
