using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service interface for chunking notes for RAG processing
/// </summary>
public interface IChunkingService
{
    /// <summary>
    /// Chunks a note into smaller pieces for embedding
    /// </summary>
    List<NoteChunk> ChunkNote(Note note);

    /// <summary>
    /// Chunks text into smaller pieces
    /// </summary>
    List<NoteChunk> ChunkText(string text, int maxChunkSize, int overlap);
}

