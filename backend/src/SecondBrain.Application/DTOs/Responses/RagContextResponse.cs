namespace SecondBrain.Application.DTOs.Responses;

public class RagContextResponse
{
    public string NoteId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public float RelevanceScore { get; set; }
    public string ChunkContent { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime? CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }
    public int ChunkIndex { get; set; }
}

public class IndexStatsResponse
{
    public IndexStatsData? PostgreSQL { get; set; }
    public IndexStatsData? Pinecone { get; set; }
}

public class IndexStatsData
{
    public int TotalEmbeddings { get; set; }
    public int UniqueNotes { get; set; }
    public DateTime? LastIndexedAt { get; set; }
    public string EmbeddingProvider { get; set; } = string.Empty;
    public string VectorStoreProvider { get; set; } = string.Empty;

    /// <summary>
    /// Total number of notes in the system for the user
    /// </summary>
    public int TotalNotesInSystem { get; set; }

    /// <summary>
    /// Number of notes that are not indexed in this vector store
    /// </summary>
    public int NotIndexedCount { get; set; }

    /// <summary>
    /// Number of notes that are indexed but have been modified since last indexing
    /// </summary>
    public int StaleNotesCount { get; set; }
}

public class IndexingJobResponse
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalNotes { get; set; }
    public int ProcessedNotes { get; set; }
    public int SkippedNotes { get; set; }
    public int DeletedNotes { get; set; }
    public int TotalChunks { get; set; }
    public int ProcessedChunks { get; set; }
    public List<string> Errors { get; set; } = new();
    public string EmbeddingProvider { get; set; } = string.Empty;
    public string EmbeddingModel { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ProgressPercentage
    {
        get
        {
            if (TotalNotes == 0) return 0;
            return (int)((ProcessedNotes / (double)TotalNotes) * 100);
        }
    }
}

/// <summary>
/// Response for a background summary generation job.
/// </summary>
public class SummaryJobResponse
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalNotes { get; set; }
    public int ProcessedNotes { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int SkippedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ProgressPercentage
    {
        get
        {
            if (TotalNotes == 0) return 0;
            return (int)((ProcessedNotes / (double)TotalNotes) * 100);
        }
    }
}

/// <summary>
/// Response for embedding provider information including available models
/// </summary>
public class EmbeddingProviderResponse
{
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string CurrentModel { get; set; } = string.Empty;
    public int CurrentDimensions { get; set; }
    public List<EmbeddingModelResponse> AvailableModels { get; set; } = new();
}

/// <summary>
/// Information about an embedding model
/// </summary>
public class EmbeddingModelResponse
{
    public string ModelId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int Dimensions { get; set; }
    public bool SupportsPinecone { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }

    /// <summary>
    /// Whether this model supports custom output dimensions
    /// </summary>
    public bool SupportsCustomDimensions { get; set; }

    /// <summary>
    /// Minimum allowed dimensions (only set if SupportsCustomDimensions is true)
    /// </summary>
    public int? MinDimensions { get; set; }

    /// <summary>
    /// Maximum allowed dimensions (only set if SupportsCustomDimensions is true)
    /// </summary>
    public int? MaxDimensions { get; set; }
}

