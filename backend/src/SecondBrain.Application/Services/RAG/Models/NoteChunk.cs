namespace SecondBrain.Application.Services.RAG.Models;

public class NoteChunk
{
    public string Content { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public int StartPosition { get; set; }
    public int EndPosition { get; set; }
    public int TokenCount { get; set; }
}

