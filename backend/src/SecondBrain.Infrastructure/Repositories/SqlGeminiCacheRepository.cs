using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of Gemini context cache repository
/// </summary>
public class SqlGeminiCacheRepository : IGeminiCacheRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlGeminiCacheRepository> _logger;

    public SqlGeminiCacheRepository(
        ApplicationDbContext context,
        ILogger<SqlGeminiCacheRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GeminiContextCache> CreateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default)
    {
        _context.GeminiContextCaches.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<GeminiContextCache?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<GeminiContextCache?> GetByCacheNameAsync(string cacheName, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.CacheName == cacheName, cancellationToken);
    }

    public async Task<GeminiContextCache?> UpdateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default)
    {
        var existing = await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == entity.Id, cancellationToken);

        if (existing == null)
            return null;

        // Update fields
        existing.ExpiresAt = entity.ExpiresAt;
        existing.TokenCount = entity.TokenCount;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (entity == null)
            return false;

        _context.GeminiContextCaches.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IEnumerable<GeminiContextCache>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<GeminiContextCache?> FindByContentHashAsync(
        string contentHash,
        string model,
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.UserId == userId
                     && c.ContentHash == contentHash
                     && c.Model == model
                     && c.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IEnumerable<GeminiContextCache>> GetExpiredCachesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync(cancellationToken);
    }
}
