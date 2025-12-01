using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of RAG query log repository
/// </summary>
public class SqlRagQueryLogRepository : IRagQueryLogRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlRagQueryLogRepository> _logger;

    public SqlRagQueryLogRepository(
        ApplicationDbContext context,
        ILogger<SqlRagQueryLogRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RagQueryLog> CreateAsync(RagQueryLog log)
    {
        _context.RagQueryLogs.Add(log);
        await _context.SaveChangesAsync();
        return log;
    }

    public async Task<RagQueryLog?> GetByIdAsync(Guid id)
    {
        return await _context.RagQueryLogs.FindAsync(id);
    }

    public async Task<RagQueryLog?> UpdateAsync(Guid id, RagQueryLog log)
    {
        var existing = await _context.RagQueryLogs.FindAsync(id);
        if (existing == null)
            return null;

        // Update fields
        existing.UserFeedback = log.UserFeedback;
        existing.FeedbackCategory = log.FeedbackCategory;
        existing.FeedbackComment = log.FeedbackComment;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<IEnumerable<RagQueryLog>> GetByUserIdAsync(string userId, DateTime? since = null)
    {
        var query = _context.RagQueryLogs
            .Where(l => l.UserId == userId);

        if (since.HasValue)
        {
            query = query.Where(l => l.CreatedAt >= since.Value);
        }

        return await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
    }

    public async Task<IEnumerable<RagQueryLog>> GetWithFeedbackAsync(string userId, DateTime? since = null)
    {
        var query = _context.RagQueryLogs
            .Where(l => l.UserId == userId && !string.IsNullOrEmpty(l.UserFeedback));

        if (since.HasValue)
        {
            query = query.Where(l => l.CreatedAt >= since.Value);
        }

        return await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
    }
}

