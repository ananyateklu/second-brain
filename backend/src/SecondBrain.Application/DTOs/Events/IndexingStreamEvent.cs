namespace SecondBrain.Application.DTOs.Events;

/// <summary>
/// Events streamed during indexing via SSE
/// </summary>
public record IndexingStartEvent(
    string JobId,
    string VectorStore,
    int TotalNotes,
    int SkippedNotes,
    int DeletedNotes,
    string EmbeddingProvider,
    string EmbeddingModel,
    DateTime StartedAt
);

public record IndexingProgressEvent(
    string JobId,
    int ProcessedCount,
    int TotalCount,
    int EmbeddingsCreated,
    string? CurrentNoteTitle,
    double ProgressPercent
);

public record IndexingStatsEvent(
    int IndexedCount,
    int PendingCount,
    int TotalNotes,
    int Dimensions,
    DateTime? LastIndexedAt,
    string VectorStore
);

public record IndexingCompleteEvent(
    string JobId,
    int TotalProcessed,
    int EmbeddingsCreated,
    int SkippedNotes,
    int DeletedNotes,
    int FailedCount,
    TimeSpan Duration,
    IndexingStatsEvent FinalStats
);

public record IndexingErrorEvent(
    string JobId,
    string Code,
    string Message
);
