namespace SecondBrain.Application.Services.Embeddings.Models;

public class EmbeddingResponse
{
    public bool Success { get; set; }
    public List<double> Embedding { get; set; } = new();
    public string Error { get; set; } = string.Empty;
    public int TokensUsed { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
}

public class BatchEmbeddingResponse
{
    public bool Success { get; set; }
    public List<List<double>> Embeddings { get; set; } = new();
    public string Error { get; set; } = string.Empty;
    public int TotalTokensUsed { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
}

