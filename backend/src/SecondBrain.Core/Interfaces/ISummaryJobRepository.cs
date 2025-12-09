using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface ISummaryJobRepository
{
    Task<SummaryJob> CreateAsync(SummaryJob job);
    Task<SummaryJob?> GetByIdAsync(string id);
    Task<SummaryJob?> UpdateAsync(string id, SummaryJob job);
    Task<IEnumerable<SummaryJob>> GetByUserIdAsync(string userId);
    Task<SummaryJob?> GetLatestByUserIdAsync(string userId);
    Task<SummaryJob?> GetActiveByUserIdAsync(string userId);
    Task<bool> DeleteAsync(string id);
}
