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
}

public class IndexingJobResponse
{
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalNotes { get; set; }
    public int ProcessedNotes { get; set; }
    public int TotalChunks { get; set; }
    public int ProcessedChunks { get; set; }
    public List<string> Errors { get; set; } = new();
    public string EmbeddingProvider { get; set; } = string.Empty;
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

