using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG.Models;

public class RagContext
{
    public string FormattedContext { get; set; } = string.Empty;
    public List<VectorSearchResult> RetrievedNotes { get; set; } = new();
    public int TotalTokensUsed { get; set; }
    
    /// <summary>
    /// The RAG query log ID for feedback submission.
    /// This is set when analytics are enabled and the query is logged.
    /// </summary>
    public Guid? RagLogId { get; set; }
}

