namespace SecondBrain.Core.Models;

/// <summary>
/// Represents a result from a vector similarity search
/// </summary>
public class VectorSearchResult
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string NoteTitle { get; set; } = string.Empty;
    public List<string> NoteTags { get; set; } = new();
    public int ChunkIndex { get; set; }
    public float SimilarityScore { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Statistics about the vector index
/// </summary>
public class IndexStats
{
    public string UserId { get; set; } = string.Empty;
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

