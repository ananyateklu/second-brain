using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface INoteEmbeddingRepository
{
    Task<NoteEmbedding> CreateAsync(NoteEmbedding embedding);
    Task<IEnumerable<NoteEmbedding>> CreateBatchAsync(IEnumerable<NoteEmbedding> embeddings);
    Task<NoteEmbedding?> GetByIdAsync(string id);
    Task<IEnumerable<NoteEmbedding>> GetByNoteIdAsync(string noteId);
    Task<IEnumerable<NoteEmbedding>> GetByUserIdAsync(string userId);
    Task<bool> DeleteByNoteIdAsync(string noteId);
    Task<bool> DeleteByUserIdAsync(string userId);
    Task<int> CountByUserIdAsync(string userId);
}

