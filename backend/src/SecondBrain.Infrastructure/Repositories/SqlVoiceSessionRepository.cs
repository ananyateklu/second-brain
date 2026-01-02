using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for voice session persistence and retrieval.
/// Uses PostgreSQL with UUIDv7 for time-ordered IDs.
/// </summary>
public class SqlVoiceSessionRepository : IVoiceSessionRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlVoiceSessionRepository> _logger;

    // Compiled query for checking session ownership - eliminates query compilation overhead
    private static readonly Func<ApplicationDbContext, Guid, string, Task<bool>> ExistsForUserCompiledQuery =
        EF.CompileAsyncQuery((ApplicationDbContext ctx, Guid sessionId, string userId) =>
            ctx.VoiceSessions.Any(s => s.Id == sessionId && s.UserId == userId));

    public SqlVoiceSessionRepository(ApplicationDbContext context, ILogger<SqlVoiceSessionRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<VoiceSession> CreateAsync(VoiceSession session, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Creating voice session. UserId: {UserId}, Provider: {Provider}, Model: {Model}",
                session.UserId, session.Provider, session.Model);

            if (session.Id == Guid.Empty)
            {
                session.Id = Guid.CreateVersion7();
            }

            session.CreatedAt = DateTime.UtcNow;
            session.StartedAt = DateTime.UtcNow;

            _context.VoiceSessions.Add(session);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Voice session created. SessionId: {SessionId}, UserId: {UserId}",
                session.Id, session.UserId);

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating voice session. UserId: {UserId}", session.UserId);
            throw new RepositoryException("Failed to create voice session", ex);
        }
    }

    public async Task<VoiceSession?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Retrieving voice session. SessionId: {SessionId}", id);

            var session = await _context.VoiceSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (session == null)
            {
                _logger.LogDebug("Voice session not found. SessionId: {SessionId}", id);
            }

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving voice session. SessionId: {SessionId}", id);
            throw new RepositoryException($"Failed to retrieve voice session with ID '{id}'", ex);
        }
    }

    public async Task<VoiceSession?> GetByIdForUserAsync(Guid id, string userId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Retrieving voice session for user. SessionId: {SessionId}, UserId: {UserId}",
                id, userId);

            var session = await _context.VoiceSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

            if (session == null)
            {
                _logger.LogDebug("Voice session not found for user. SessionId: {SessionId}, UserId: {UserId}",
                    id, userId);
            }

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving voice session for user. SessionId: {SessionId}, UserId: {UserId}",
                id, userId);
            throw new RepositoryException($"Failed to retrieve voice session with ID '{id}'", ex);
        }
    }

    public async Task<VoiceSession> UpdateAsync(VoiceSession session, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Updating voice session. SessionId: {SessionId}", session.Id);

            var existingSession = await _context.VoiceSessions
                .FirstOrDefaultAsync(s => s.Id == session.Id, ct);

            if (existingSession == null)
            {
                throw new RepositoryException($"Voice session with ID '{session.Id}' not found");
            }

            // Update properties
            existingSession.Status = session.Status;
            existingSession.EndedAt = session.EndedAt;
            existingSession.TotalInputTokens = session.TotalInputTokens;
            existingSession.TotalOutputTokens = session.TotalOutputTokens;
            existingSession.TotalAudioDurationMs = session.TotalAudioDurationMs;
            existingSession.OptionsJson = session.OptionsJson;

            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Voice session updated. SessionId: {SessionId}, Status: {Status}",
                session.Id, session.Status);

            return existingSession;
        }
        catch (RepositoryException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating voice session. SessionId: {SessionId}", session.Id);
            throw new RepositoryException($"Failed to update voice session with ID '{session.Id}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(Guid id, string userId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Deleting voice session. SessionId: {SessionId}, UserId: {UserId}", id, userId);

            // Use ExecuteDeleteAsync for efficient delete without loading entity
            // CASCADE delete handles related voice_turns automatically
            var deletedCount = await _context.VoiceSessions
                .Where(s => s.Id == id && s.UserId == userId)
                .ExecuteDeleteAsync(ct);

            if (deletedCount == 0)
            {
                _logger.LogDebug("Voice session not found for deletion. SessionId: {SessionId}", id);
                return false;
            }

            _logger.LogInformation("Voice session deleted. SessionId: {SessionId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting voice session. SessionId: {SessionId}", id);
            throw new RepositoryException($"Failed to delete voice session with ID '{id}'", ex);
        }
    }

    public async Task<VoiceTurn> AddTurnAsync(Guid sessionId, VoiceTurn turn, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Adding turn to voice session. SessionId: {SessionId}, Role: {Role}",
                sessionId, turn.Role);

            if (turn.Id == Guid.Empty)
            {
                turn.Id = Guid.CreateVersion7();
            }

            turn.SessionId = sessionId;
            turn.Timestamp = DateTime.UtcNow;

            _context.VoiceTurns.Add(turn);
            await _context.SaveChangesAsync(ct);

            _logger.LogDebug("Turn added to voice session. SessionId: {SessionId}, TurnId: {TurnId}",
                sessionId, turn.Id);

            return turn;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding turn to voice session. SessionId: {SessionId}", sessionId);
            throw new RepositoryException($"Failed to add turn to voice session with ID '{sessionId}'", ex);
        }
    }

    public async Task<(IEnumerable<VoiceSession> Items, int TotalCount)> GetSessionsPagedAsync(
        string userId,
        int page,
        int pageSize,
        string? status = null,
        CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Retrieving paginated voice sessions. UserId: {UserId}, Page: {Page}, PageSize: {PageSize}, Status: {Status}",
                userId, page, pageSize, status);

            var query = _context.VoiceSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId);

            // Apply status filter if provided
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(s => s.Status == status);
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync(ct);

            // Get paginated results ordered by start time (most recent first)
            var sessions = await query
                .OrderByDescending(s => s.StartedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            _logger.LogDebug("Retrieved paginated voice sessions. UserId: {UserId}, Count: {Count}, TotalCount: {TotalCount}",
                userId, sessions.Count, totalCount);

            return (sessions, totalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving paginated voice sessions. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve paginated voice sessions", ex);
        }
    }

    public async Task<VoiceSession?> GetSessionWithTurnsAsync(Guid id, string userId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Retrieving voice session with turns. SessionId: {SessionId}, UserId: {UserId}",
                id, userId);

            var session = await _context.VoiceSessions
                .Include(s => s.Turns.OrderBy(t => t.Timestamp))
                .AsNoTracking()
                .AsSplitQuery()
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

            if (session == null)
            {
                _logger.LogDebug("Voice session with turns not found. SessionId: {SessionId}", id);
            }
            else
            {
                _logger.LogDebug("Retrieved voice session with {TurnCount} turns. SessionId: {SessionId}",
                    session.Turns.Count, id);
            }

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving voice session with turns. SessionId: {SessionId}", id);
            throw new RepositoryException($"Failed to retrieve voice session with ID '{id}'", ex);
        }
    }

    public async Task<string?> GetFirstUserMessageAsync(Guid sessionId, CancellationToken ct = default)
    {
        try
        {
            var firstUserTurn = await _context.VoiceTurns
                .AsNoTracking()
                .Where(t => t.SessionId == sessionId && t.Role == VoiceTurnRole.User)
                .OrderBy(t => t.Timestamp)
                .Select(t => t.TranscriptText ?? t.Content)
                .FirstOrDefaultAsync(ct);

            return firstUserTurn;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving first user message. SessionId: {SessionId}", sessionId);
            throw new RepositoryException($"Failed to retrieve first user message for session '{sessionId}'", ex);
        }
    }

    public async Task<IEnumerable<VoiceSession>> GetActiveSessionsAsync(string userId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogDebug("Retrieving active voice sessions. UserId: {UserId}", userId);

            var sessions = await _context.VoiceSessions
                .AsNoTracking()
                .Where(s => s.UserId == userId && s.Status == VoiceSessionStatus.Active)
                .OrderByDescending(s => s.StartedAt)
                .ToListAsync(ct);

            _logger.LogDebug("Retrieved active voice sessions. UserId: {UserId}, Count: {Count}",
                userId, sessions.Count);

            return sessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active voice sessions. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve active voice sessions", ex);
        }
    }

    public async Task<int> GetActiveSessionCountAsync(string userId, CancellationToken ct = default)
    {
        try
        {
            return await _context.VoiceSessions
                .CountAsync(s => s.UserId == userId && s.Status == VoiceSessionStatus.Active, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting active voice sessions. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to count active voice sessions", ex);
        }
    }

    public async Task<bool> ExistsForUserAsync(Guid sessionId, string userId, CancellationToken ct = default)
    {
        try
        {
            try
            {
                // Use compiled query for better performance in production
                return await ExistsForUserCompiledQuery(_context, sessionId, userId);
            }
            catch (InvalidOperationException)
            {
                // Fallback to regular query when compiled query model doesn't match (e.g., in tests)
                return await _context.VoiceSessions.AnyAsync(s => s.Id == sessionId && s.UserId == userId, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking voice session existence. SessionId: {SessionId}, UserId: {UserId}",
                sessionId, userId);
            throw new RepositoryException("Failed to check voice session existence", ex);
        }
    }

    public async Task<int> EndExpiredSessionsAsync(int idleTimeoutMinutes, CancellationToken ct = default)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-idleTimeoutMinutes);

            _logger.LogDebug("Ending expired voice sessions. IdleTimeout: {IdleTimeout} minutes, Cutoff: {Cutoff}",
                idleTimeoutMinutes, cutoff);

            // Use ExecuteUpdateAsync for efficient bulk update without loading entities
            var endedCount = await _context.VoiceSessions
                .Where(s => s.Status == VoiceSessionStatus.Active && s.StartedAt < cutoff)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(s => s.Status, VoiceSessionStatus.Ended)
                        .SetProperty(s => s.EndedAt, DateTime.UtcNow),
                    ct);

            if (endedCount > 0)
            {
                _logger.LogInformation("Ended expired voice sessions. Count: {Count}", endedCount);
            }

            return endedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ending expired voice sessions");
            throw new RepositoryException("Failed to end expired voice sessions", ex);
        }
    }
}
