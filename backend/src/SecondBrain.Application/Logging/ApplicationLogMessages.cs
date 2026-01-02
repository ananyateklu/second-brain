using Microsoft.Extensions.Logging;

namespace SecondBrain.Application.Logging;

/// <summary>
/// High-performance compile-time generated logging methods for the Application layer.
/// Uses LoggerMessage source generators to avoid boxing and string parsing overhead.
/// Event IDs: 2000-2999 for Application layer.
/// </summary>
public static partial class ApplicationLogMessages
{
    #region CQRS / MediatR (2000-2099)

    [LoggerMessage(
        EventId = 2001,
        Level = LogLevel.Debug,
        Message = "Handling request. RequestType: {RequestType}, RequestId: {RequestId}")]
    public static partial void HandlingRequest(
        this ILogger logger,
        string requestType,
        string requestId);

    [LoggerMessage(
        EventId = 2002,
        Level = LogLevel.Debug,
        Message = "Request handled. RequestType: {RequestType}, RequestId: {RequestId}, Duration: {DurationMs}ms, Success: {Success}")]
    public static partial void RequestHandled(
        this ILogger logger,
        string requestType,
        string requestId,
        long durationMs,
        bool success);

    [LoggerMessage(
        EventId = 2003,
        Level = LogLevel.Warning,
        Message = "Validation failed. RequestType: {RequestType}, Errors: {ErrorCount}")]
    public static partial void ValidationFailed(
        this ILogger logger,
        string requestType,
        int errorCount);

    [LoggerMessage(
        EventId = 2004,
        Level = LogLevel.Error,
        Message = "Request handler failed. RequestType: {RequestType}, RequestId: {RequestId}, Error: {Error}")]
    public static partial void RequestHandlerFailed(
        this ILogger logger,
        Exception ex,
        string requestType,
        string requestId,
        string error);

    #endregion

    #region AI Provider Operations (2100-2199)

    [LoggerMessage(
        EventId = 2101,
        Level = LogLevel.Information,
        Message = "AI request started. Provider: {Provider}, Model: {Model}, UserId: {UserId}")]
    public static partial void AiRequestStarted(
        this ILogger logger,
        string provider,
        string model,
        string userId);

    [LoggerMessage(
        EventId = 2102,
        Level = LogLevel.Information,
        Message = "AI request completed. Provider: {Provider}, Model: {Model}, Duration: {DurationMs}ms, InputTokens: {InputTokens}, OutputTokens: {OutputTokens}")]
    public static partial void AiRequestCompleted(
        this ILogger logger,
        string provider,
        string model,
        long durationMs,
        int inputTokens,
        int outputTokens);

    [LoggerMessage(
        EventId = 2103,
        Level = LogLevel.Warning,
        Message = "AI request failed. Provider: {Provider}, Model: {Model}, Error: {Error}")]
    public static partial void AiRequestFailed(
        this ILogger logger,
        string provider,
        string model,
        string error);

    [LoggerMessage(
        EventId = 2104,
        Level = LogLevel.Debug,
        Message = "AI streaming started. Provider: {Provider}, Model: {Model}, ConversationId: {ConversationId}")]
    public static partial void AiStreamingStarted(
        this ILogger logger,
        string provider,
        string model,
        string conversationId);

    [LoggerMessage(
        EventId = 2105,
        Level = LogLevel.Debug,
        Message = "AI streaming first token. Provider: {Provider}, TimeToFirstToken: {TimeToFirstTokenMs}ms")]
    public static partial void AiStreamingFirstToken(
        this ILogger logger,
        string provider,
        long timeToFirstTokenMs);

    [LoggerMessage(
        EventId = 2106,
        Level = LogLevel.Debug,
        Message = "AI streaming completed. Provider: {Provider}, TotalDuration: {DurationMs}ms, ChunkCount: {ChunkCount}")]
    public static partial void AiStreamingCompleted(
        this ILogger logger,
        string provider,
        long durationMs,
        int chunkCount);

    #endregion

    #region Circuit Breaker (2200-2249)

    [LoggerMessage(
        EventId = 2201,
        Level = LogLevel.Warning,
        Message = "Circuit breaker OPENED for provider {Provider}. Duration: {BreakDurationSeconds}s, LastError: {LastError}")]
    public static partial void CircuitBreakerOpened(
        this ILogger logger,
        string provider,
        int breakDurationSeconds,
        string lastError);

    [LoggerMessage(
        EventId = 2202,
        Level = LogLevel.Information,
        Message = "Circuit breaker CLOSED for provider {Provider}. Service recovered.")]
    public static partial void CircuitBreakerClosed(
        this ILogger logger,
        string provider);

    [LoggerMessage(
        EventId = 2203,
        Level = LogLevel.Information,
        Message = "Circuit breaker HALF-OPEN for provider {Provider}. Testing recovery...")]
    public static partial void CircuitBreakerHalfOpen(
        this ILogger logger,
        string provider);

    [LoggerMessage(
        EventId = 2204,
        Level = LogLevel.Debug,
        Message = "Circuit breaker created. Provider: {Provider}, FailureRatio: {FailureRatio}, BreakDuration: {BreakDurationSeconds}s")]
    public static partial void CircuitBreakerCreated(
        this ILogger logger,
        string provider,
        double failureRatio,
        int breakDurationSeconds);

    #endregion

    #region RAG Pipeline (2250-2299)

    [LoggerMessage(
        EventId = 2251,
        Level = LogLevel.Debug,
        Message = "RAG query started. Query: {QueryPreview}, UserId: {UserId}, TopK: {TopK}")]
    public static partial void RagQueryStarted(
        this ILogger logger,
        string queryPreview,
        string userId,
        int topK);

    [LoggerMessage(
        EventId = 2252,
        Level = LogLevel.Debug,
        Message = "RAG query expansion. OriginalQuery: {OriginalQuery}, ExpandedQueries: {ExpandedQueryCount}")]
    public static partial void RagQueryExpansion(
        this ILogger logger,
        string originalQuery,
        int expandedQueryCount);

    [LoggerMessage(
        EventId = 2253,
        Level = LogLevel.Debug,
        Message = "RAG hybrid search. VectorResults: {VectorCount}, BM25Results: {Bm25Count}, Duration: {DurationMs}ms")]
    public static partial void RagHybridSearch(
        this ILogger logger,
        int vectorCount,
        int bm25Count,
        long durationMs);

    [LoggerMessage(
        EventId = 2254,
        Level = LogLevel.Debug,
        Message = "RAG reranking. InputCount: {InputCount}, OutputCount: {OutputCount}, Duration: {DurationMs}ms")]
    public static partial void RagReranking(
        this ILogger logger,
        int inputCount,
        int outputCount,
        long durationMs);

    [LoggerMessage(
        EventId = 2255,
        Level = LogLevel.Information,
        Message = "RAG query completed. TotalDuration: {DurationMs}ms, DocumentsRetrieved: {DocumentCount}, AvgRelevance: {AvgRelevance:F2}")]
    public static partial void RagQueryCompleted(
        this ILogger logger,
        long durationMs,
        int documentCount,
        double avgRelevance);

    [LoggerMessage(
        EventId = 2256,
        Level = LogLevel.Debug,
        Message = "RAG cache hit. CacheKey: {CacheKeyPreview}, Age: {AgeMinutes} minutes")]
    public static partial void RagCacheHit(
        this ILogger logger,
        string cacheKeyPreview,
        int ageMinutes);

    #endregion

    #region Agent Operations (2300-2349)

    [LoggerMessage(
        EventId = 2301,
        Level = LogLevel.Information,
        Message = "Agent execution started. Provider: {Provider}, ConversationId: {ConversationId}, ToolsEnabled: {ToolsEnabled}")]
    public static partial void AgentExecutionStarted(
        this ILogger logger,
        string provider,
        string conversationId,
        bool toolsEnabled);

    [LoggerMessage(
        EventId = 2302,
        Level = LogLevel.Debug,
        Message = "Agent tool call. Tool: {ToolName}, Duration: {DurationMs}ms, Success: {Success}")]
    public static partial void AgentToolCall(
        this ILogger logger,
        string toolName,
        long durationMs,
        bool success);

    [LoggerMessage(
        EventId = 2303,
        Level = LogLevel.Debug,
        Message = "Agent thinking step. Provider: {Provider}, StepNumber: {StepNumber}, ContentLength: {ContentLength}")]
    public static partial void AgentThinkingStep(
        this ILogger logger,
        string provider,
        int stepNumber,
        int contentLength);

    [LoggerMessage(
        EventId = 2304,
        Level = LogLevel.Information,
        Message = "Agent execution completed. Provider: {Provider}, Duration: {DurationMs}ms, ToolCalls: {ToolCallCount}, ThinkingSteps: {ThinkingStepCount}")]
    public static partial void AgentExecutionCompleted(
        this ILogger logger,
        string provider,
        long durationMs,
        int toolCallCount,
        int thinkingStepCount);

    [LoggerMessage(
        EventId = 2305,
        Level = LogLevel.Warning,
        Message = "Agent tool execution failed. Tool: {ToolName}, Error: {Error}")]
    public static partial void AgentToolFailed(
        this ILogger logger,
        string toolName,
        string error);

    #endregion

    #region Embedding Operations (2350-2399)

    [LoggerMessage(
        EventId = 2351,
        Level = LogLevel.Debug,
        Message = "Embedding generation started. Provider: {Provider}, TextCount: {TextCount}, TotalChars: {TotalChars}")]
    public static partial void EmbeddingStarted(
        this ILogger logger,
        string provider,
        int textCount,
        int totalChars);

    [LoggerMessage(
        EventId = 2352,
        Level = LogLevel.Debug,
        Message = "Embedding generation completed. Provider: {Provider}, Duration: {DurationMs}ms, Dimensions: {Dimensions}")]
    public static partial void EmbeddingCompleted(
        this ILogger logger,
        string provider,
        long durationMs,
        int dimensions);

    [LoggerMessage(
        EventId = 2353,
        Level = LogLevel.Debug,
        Message = "Embedding cache hit. Provider: {Provider}, CacheKey: {CacheKeyPreview}")]
    public static partial void EmbeddingCacheHit(
        this ILogger logger,
        string provider,
        string cacheKeyPreview);

    #endregion

    #region Voice Operations (2400-2449)

    [LoggerMessage(
        EventId = 2401,
        Level = LogLevel.Information,
        Message = "Voice session started. SessionId: {SessionId}, Provider: {Provider}, UserId: {UserId}")]
    public static partial void VoiceSessionStarted(
        this ILogger logger,
        string sessionId,
        string provider,
        string userId);

    [LoggerMessage(
        EventId = 2402,
        Level = LogLevel.Information,
        Message = "Voice session ended. SessionId: {SessionId}, Duration: {DurationMs}ms, TurnsCount: {TurnsCount}")]
    public static partial void VoiceSessionEnded(
        this ILogger logger,
        string sessionId,
        long durationMs,
        int turnsCount);

    [LoggerMessage(
        EventId = 2403,
        Level = LogLevel.Debug,
        Message = "Transcription completed. Provider: {Provider}, Duration: {DurationMs}ms, TextLength: {TextLength}")]
    public static partial void TranscriptionCompleted(
        this ILogger logger,
        string provider,
        long durationMs,
        int textLength);

    [LoggerMessage(
        EventId = 2404,
        Level = LogLevel.Debug,
        Message = "Speech synthesis completed. Provider: {Provider}, Duration: {DurationMs}ms, AudioDuration: {AudioDurationMs}ms")]
    public static partial void SpeechSynthesisCompleted(
        this ILogger logger,
        string provider,
        long durationMs,
        long audioDurationMs);

    #endregion

    #region Note Operations (2450-2499)

    [LoggerMessage(
        EventId = 2451,
        Level = LogLevel.Debug,
        Message = "Note created. NoteId: {NoteId}, UserId: {UserId}, ContentLength: {ContentLength}")]
    public static partial void NoteCreated(
        this ILogger logger,
        string noteId,
        string userId,
        int contentLength);

    [LoggerMessage(
        EventId = 2452,
        Level = LogLevel.Debug,
        Message = "Note updated. NoteId: {NoteId}, UserId: {UserId}, VersionNumber: {VersionNumber}")]
    public static partial void NoteUpdated(
        this ILogger logger,
        string noteId,
        string userId,
        int versionNumber);

    [LoggerMessage(
        EventId = 2453,
        Level = LogLevel.Debug,
        Message = "Note indexing started. NoteId: {NoteId}, ChunkCount: {ChunkCount}")]
    public static partial void NoteIndexingStarted(
        this ILogger logger,
        string noteId,
        int chunkCount);

    [LoggerMessage(
        EventId = 2454,
        Level = LogLevel.Debug,
        Message = "Note indexing completed. NoteId: {NoteId}, Duration: {DurationMs}ms, EmbeddingsCreated: {EmbeddingsCreated}")]
    public static partial void NoteIndexingCompleted(
        this ILogger logger,
        string noteId,
        long durationMs,
        int embeddingsCreated);

    #endregion

    #region Focus/Productivity (2500-2549)

    [LoggerMessage(
        EventId = 2501,
        Level = LogLevel.Debug,
        Message = "Focus suggestion generated. UserId: {UserId}, SuggestionCount: {SuggestionCount}, Duration: {DurationMs}ms")]
    public static partial void FocusSuggestionGenerated(
        this ILogger logger,
        string userId,
        int suggestionCount,
        long durationMs);

    [LoggerMessage(
        EventId = 2502,
        Level = LogLevel.Debug,
        Message = "Focus timer started. ItemId: {ItemId}, UserId: {UserId}")]
    public static partial void FocusTimerStarted(
        this ILogger logger,
        string itemId,
        string userId);

    [LoggerMessage(
        EventId = 2503,
        Level = LogLevel.Debug,
        Message = "Focus timer stopped. ItemId: {ItemId}, AccumulatedMinutes: {AccumulatedMinutes}")]
    public static partial void FocusTimerStopped(
        this ILogger logger,
        string itemId,
        int accumulatedMinutes);

    #endregion
}
