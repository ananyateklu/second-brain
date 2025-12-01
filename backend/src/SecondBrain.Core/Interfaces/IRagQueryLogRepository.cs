using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository for RAG query analytics logs
/// </summary>
public interface IRagQueryLogRepository
{
    Task<RagQueryLog> CreateAsync(RagQueryLog log);
    Task<RagQueryLog?> GetByIdAsync(Guid id);
    Task<RagQueryLog?> UpdateAsync(Guid id, RagQueryLog log);
    Task<IEnumerable<RagQueryLog>> GetByUserIdAsync(string userId, DateTime? since = null);
    Task<IEnumerable<RagQueryLog>> GetWithFeedbackAsync(string userId, DateTime? since = null);
}

