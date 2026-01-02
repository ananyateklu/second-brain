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
    public static readonly ActivitySource ChatSource = new("SecondBrain.Chat");
    public static readonly ActivitySource NotesSource = new("SecondBrain.Notes");
    public static readonly ActivitySource VoiceSource = new("SecondBrain.Voice");
    public static readonly ActivitySource FocusSource = new("SecondBrain.Focus");

    // Meters for Metrics
    public static readonly Meter AIMetrics = new("SecondBrain.AI", ServiceVersion);
    public static readonly Meter RAGMetrics = new("SecondBrain.RAG", ServiceVersion);
    public static readonly Meter CacheMetrics = new("SecondBrain.Cache", ServiceVersion);
    public static readonly Meter DatabaseMetrics = new("SecondBrain.Database", ServiceVersion);
    public static readonly Meter NotesMetrics = new("SecondBrain.Notes", ServiceVersion);
    public static readonly Meter VoiceMetrics = new("SecondBrain.Voice", ServiceVersion);
    public static readonly Meter FocusMetrics = new("SecondBrain.Focus", ServiceVersion);
    public static readonly Meter CircuitBreakerMetrics = new("SecondBrain.CircuitBreaker", ServiceVersion);

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

    // Database Counters
    public static readonly Counter<long> DbQueriesTotal = DatabaseMetrics.CreateCounter<long>(
        "db_queries_total",
        description: "Total database queries executed");

    public static readonly Counter<long> DbErrorsTotal = DatabaseMetrics.CreateCounter<long>(
        "db_errors_total",
        description: "Total database errors");

    public static readonly Counter<long> DbBulkOperationsTotal = DatabaseMetrics.CreateCounter<long>(
        "db_bulk_operations_total",
        description: "Total bulk database operations (ExecuteUpdate/ExecuteDelete)");

    // Database Histograms
    public static readonly Histogram<double> DbQueryDuration = DatabaseMetrics.CreateHistogram<double>(
        "db_query_duration_ms",
        unit: "ms",
        description: "Database query duration in milliseconds");

    public static readonly Histogram<int> DbBulkOperationRows = DatabaseMetrics.CreateHistogram<int>(
        "db_bulk_operation_rows",
        description: "Number of rows affected by bulk operations");

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

    // Notes Metrics
    public static readonly Counter<long> NotesCreatedTotal = NotesMetrics.CreateCounter<long>(
        "notes_created_total",
        description: "Total notes created");

    public static readonly Counter<long> NotesUpdatedTotal = NotesMetrics.CreateCounter<long>(
        "notes_updated_total",
        description: "Total note updates");

    public static readonly Counter<long> NotesDeletedTotal = NotesMetrics.CreateCounter<long>(
        "notes_deleted_total",
        description: "Total notes deleted (soft delete)");

    public static readonly Counter<long> NotesIndexedTotal = NotesMetrics.CreateCounter<long>(
        "notes_indexed_total",
        description: "Total notes indexed for RAG");

    public static readonly Histogram<double> NoteIndexingDuration = NotesMetrics.CreateHistogram<double>(
        "note_indexing_duration_ms",
        unit: "ms",
        description: "Note indexing duration in milliseconds");

    // Voice Metrics
    public static readonly Counter<long> VoiceSessionsTotal = VoiceMetrics.CreateCounter<long>(
        "voice_sessions_total",
        description: "Total voice sessions started");

    public static readonly Counter<long> VoiceTurnsTotal = VoiceMetrics.CreateCounter<long>(
        "voice_turns_total",
        description: "Total voice turns (user + assistant)");

    public static readonly Histogram<double> VoiceSessionDuration = VoiceMetrics.CreateHistogram<double>(
        "voice_session_duration_ms",
        unit: "ms",
        description: "Voice session duration in milliseconds");

    public static readonly Histogram<double> TranscriptionDuration = VoiceMetrics.CreateHistogram<double>(
        "transcription_duration_ms",
        unit: "ms",
        description: "Speech-to-text transcription duration");

    public static readonly Histogram<double> SynthesisDuration = VoiceMetrics.CreateHistogram<double>(
        "synthesis_duration_ms",
        unit: "ms",
        description: "Text-to-speech synthesis duration");

    // Focus Metrics
    public static readonly Counter<long> FocusItemsCreatedTotal = FocusMetrics.CreateCounter<long>(
        "focus_items_created_total",
        description: "Total focus items created");

    public static readonly Counter<long> FocusItemsCompletedTotal = FocusMetrics.CreateCounter<long>(
        "focus_items_completed_total",
        description: "Total focus items completed");

    public static readonly Counter<long> FocusSuggestionsGeneratedTotal = FocusMetrics.CreateCounter<long>(
        "focus_suggestions_generated_total",
        description: "Total AI focus suggestions generated");

    public static readonly Histogram<double> FocusTimerMinutes = FocusMetrics.CreateHistogram<double>(
        "focus_timer_minutes",
        unit: "minutes",
        description: "Focus timer session duration in minutes");

    // Circuit Breaker Metrics
    public static readonly Counter<long> CircuitBreakerOpenedTotal = CircuitBreakerMetrics.CreateCounter<long>(
        "circuit_breaker_opened_total",
        description: "Total times circuit breaker opened");

    public static readonly Counter<long> CircuitBreakerClosedTotal = CircuitBreakerMetrics.CreateCounter<long>(
        "circuit_breaker_closed_total",
        description: "Total times circuit breaker closed after recovery");

    public static readonly Counter<long> CircuitBreakerHalfOpenTotal = CircuitBreakerMetrics.CreateCounter<long>(
        "circuit_breaker_half_open_total",
        description: "Total times circuit breaker entered half-open state");

    public static readonly Counter<long> CircuitBreakerRejectedTotal = CircuitBreakerMetrics.CreateCounter<long>(
        "circuit_breaker_rejected_total",
        description: "Total requests rejected by open circuit breaker");

    // Circuit Breaker Gauge
    private static readonly List<Func<IEnumerable<Measurement<int>>>> CircuitBreakerStateCallbacks = new();

    public static readonly ObservableGauge<int> CircuitBreakerState = AIMetrics.CreateObservableGauge(
        "circuit_breaker_state",
        () => CircuitBreakerStateCallbacks.SelectMany(cb => cb()),
        description: "Circuit breaker state (0=Closed, 1=Open, 2=HalfOpen)");

    /// <summary>
    /// Registers a callback to report circuit breaker states.
    /// Call this from AIProviderCircuitBreaker to report per-provider states.
    /// </summary>
    public static void RegisterCircuitBreakerStateCallback(Func<IEnumerable<Measurement<int>>> callback)
    {
        CircuitBreakerStateCallbacks.Add(callback);
    }

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

    public static Activity? StartNotesActivity(string operation, string? noteId = null, string? userId = null)
    {
        var activity = NotesSource.StartActivity(operation, ActivityKind.Internal);
        if (noteId != null) activity?.SetTag("note.id", noteId);
        if (userId != null) activity?.SetTag("user.id", userId);
        return activity;
    }

    public static Activity? StartVoiceActivity(string operation, string? sessionId = null, string? userId = null)
    {
        var activity = VoiceSource.StartActivity(operation, ActivityKind.Internal);
        if (sessionId != null) activity?.SetTag("voice.session.id", sessionId);
        if (userId != null) activity?.SetTag("user.id", userId);
        return activity;
    }

    public static Activity? StartFocusActivity(string operation, string? itemId = null, string? userId = null)
    {
        var activity = FocusSource.StartActivity(operation, ActivityKind.Internal);
        if (itemId != null) activity?.SetTag("focus.item.id", itemId);
        if (userId != null) activity?.SetTag("user.id", userId);
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
    public static void RecordAIRequest(string provider, string model, double durationMs, bool success)
    {
        var tags = new TagList
        {
            { "provider", provider },
            { "model", model },
            { "success", success.ToString().ToLowerInvariant() }
        };

        AIRequestsTotal.Add(1, tags);
        AIResponseDuration.Record(durationMs, tags);

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

    // Helper to record notes metrics
    public static void RecordNoteCreated(string userId)
    {
        NotesCreatedTotal.Add(1, new TagList { { "user.id", userId } });
    }

    public static void RecordNoteUpdated(string userId)
    {
        NotesUpdatedTotal.Add(1, new TagList { { "user.id", userId } });
    }

    public static void RecordNoteDeleted(string userId)
    {
        NotesDeletedTotal.Add(1, new TagList { { "user.id", userId } });
    }

    public static void RecordNoteIndexed(double durationMs, int chunkCount)
    {
        NotesIndexedTotal.Add(1);
        NoteIndexingDuration.Record(durationMs, new TagList { { "chunk_count", chunkCount.ToString() } });
    }

    // Helper to record voice metrics
    public static void RecordVoiceSessionStarted(string provider)
    {
        VoiceSessionsTotal.Add(1, new TagList { { "provider", provider } });
    }

    public static void RecordVoiceSessionEnded(string provider, double durationMs, int turnsCount)
    {
        var tags = new TagList
        {
            { "provider", provider },
            { "turns", turnsCount.ToString() }
        };
        VoiceSessionDuration.Record(durationMs, tags);
    }

    public static void RecordTranscription(string provider, double durationMs)
    {
        TranscriptionDuration.Record(durationMs, new TagList { { "provider", provider } });
    }

    public static void RecordSynthesis(string provider, double durationMs)
    {
        SynthesisDuration.Record(durationMs, new TagList { { "provider", provider } });
    }

    // Helper to record focus metrics
    public static void RecordFocusItemCreated(string priority)
    {
        FocusItemsCreatedTotal.Add(1, new TagList { { "priority", priority } });
    }

    public static void RecordFocusItemCompleted(string priority)
    {
        FocusItemsCompletedTotal.Add(1, new TagList { { "priority", priority } });
    }

    public static void RecordFocusSuggestionGenerated(int suggestionCount)
    {
        FocusSuggestionsGeneratedTotal.Add(suggestionCount);
    }

    public static void RecordFocusTimerSession(double minutes, string priority)
    {
        FocusTimerMinutes.Record(minutes, new TagList { { "priority", priority } });
    }

    // Helper to record circuit breaker metrics
    public static void RecordCircuitBreakerOpened(string provider)
    {
        CircuitBreakerOpenedTotal.Add(1, new TagList { { "provider", provider } });
    }

    public static void RecordCircuitBreakerClosed(string provider)
    {
        CircuitBreakerClosedTotal.Add(1, new TagList { { "provider", provider } });
    }

    public static void RecordCircuitBreakerHalfOpen(string provider)
    {
        CircuitBreakerHalfOpenTotal.Add(1, new TagList { { "provider", provider } });
    }

    public static void RecordCircuitBreakerRejected(string provider)
    {
        CircuitBreakerRejectedTotal.Add(1, new TagList { { "provider", provider } });
    }
}
