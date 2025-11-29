using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG.Models;

public class RagContext
{
    public string FormattedContext { get; set; } = string.Empty;
    public List<VectorSearchResult> RetrievedNotes { get; set; } = new();
    public int TotalTokensUsed { get; set; }
}

