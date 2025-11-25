using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface IIndexingJobRepository
{
    Task<IndexingJob> CreateAsync(IndexingJob job);
    Task<IndexingJob?> GetByIdAsync(string id);
    Task<IndexingJob?> UpdateAsync(string id, IndexingJob job);
    Task<IEnumerable<IndexingJob>> GetByUserIdAsync(string userId);
    Task<IndexingJob?> GetLatestByUserIdAsync(string userId);
    Task<bool> DeleteAsync(string id);
}

