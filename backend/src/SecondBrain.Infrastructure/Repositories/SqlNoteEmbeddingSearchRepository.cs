using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of note embedding search repository for BM25/hybrid search
/// </summary>
public class SqlNoteEmbeddingSearchRepository : INoteEmbeddingSearchRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteEmbeddingSearchRepository> _logger;

    public SqlNoteEmbeddingSearchRepository(
        ApplicationDbContext context,
        ILogger<SqlNoteEmbeddingSearchRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<NoteEmbedding>> GetWithSearchVectorAsync(CancellationToken cancellationToken = default)
    {
        return await _context.NoteEmbeddings
            .Where(e => e.SearchVector != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByUserIdWithSearchVectorAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.NoteEmbeddings
            .Where(e => e.UserId == userId && e.SearchVector != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }
}

