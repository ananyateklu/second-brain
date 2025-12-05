using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of IChatSessionRepository using PostgreSQL 18 temporal features.
/// Leverages WITHOUT OVERLAPS constraints and temporal query functions.
/// </summary>
public class SqlChatSessionRepository : IChatSessionRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlChatSessionRepository> _logger;

    public SqlChatSessionRepository(
        ApplicationDbContext context,
        ILogger<SqlChatSessionRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ChatSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<ChatSession?> GetActiveSessionAsync(string userId, string conversationId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Active session has unbounded upper limit (infinity)
            return await _context.ChatSessions
                .Where(s => s.UserId == userId && s.ConversationId == conversationId)
                .Where(s => s.SessionPeriod.UpperBoundInfinite)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active session for user {UserId} and conversation {ConversationId}", userId, conversationId);
            throw;
        }
    }

    public async Task<List<ChatSession>> GetActiveSessionsForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ChatSessions
                .Where(s => s.UserId == userId)
                .Where(s => s.SessionPeriod.UpperBoundInfinite)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active sessions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<ChatSession>> GetSessionHistoryAsync(string conversationId, int skip, int take, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ChatSessions
                .Where(s => s.ConversationId == conversationId)
                .OrderByDescending(s => s.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session history for conversation {ConversationId}", conversationId);
            throw;
        }
    }

    public async Task<List<ChatSession>> GetUserSessionsAsync(string userId, DateTime since, DateTime? until = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var untilDate = until ?? DateTime.UtcNow;

            // Use raw SQL for range overlap query
            var sql = @"
                SELECT id, user_id, conversation_id, session_period, device_info, user_agent, 
                       ip_address, messages_sent, messages_received, tokens_used, created_at
                FROM chat_sessions
                WHERE user_id = @userId
                  AND session_period && tstzrange(@since, @until, '[]')
                ORDER BY created_at DESC";

            return await _context.ChatSessions
                .FromSqlRaw(sql,
                    new NpgsqlParameter("@userId", userId),
                    new NpgsqlParameter("@since", since),
                    new NpgsqlParameter("@until", untilDate))
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get sessions for user {UserId} since {Since}", userId, since);
            throw;
        }
    }

    public async Task<string> StartSessionAsync(
        string userId,
        string conversationId,
        string? deviceInfo = null,
        string? userAgent = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Use the database function for atomic session creation
            var sql = @"
                SELECT start_chat_session(@userId, @conversationId, @deviceInfo::jsonb, @userAgent, @ipAddress)";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@userId", userId));
            command.Parameters.Add(new NpgsqlParameter("@conversationId", conversationId));
            command.Parameters.Add(new NpgsqlParameter("@deviceInfo", (object?)deviceInfo ?? DBNull.Value));
            command.Parameters.Add(new NpgsqlParameter("@userAgent", (object?)userAgent ?? DBNull.Value));
            command.Parameters.Add(new NpgsqlParameter("@ipAddress", (object?)ipAddress ?? DBNull.Value));

            var result = await command.ExecuteScalarAsync(cancellationToken);
            var sessionId = result?.ToString() ?? throw new InvalidOperationException("Failed to create session");

            _logger.LogInformation(
                "Started session {SessionId} for user {UserId} on conversation {ConversationId}",
                sessionId, userId, conversationId);

            return sessionId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start session for user {UserId} on conversation {ConversationId}", userId, conversationId);
            throw;
        }
    }

    public async Task<bool> EndSessionAsync(
        string sessionId,
        int? messagesSent = null,
        int? messagesReceived = null,
        int? tokensUsed = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Use the database function for atomic session ending
            var sql = @"
                SELECT end_chat_session(@sessionId, @messagesSent, @messagesReceived, @tokensUsed)";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@sessionId", sessionId));
            command.Parameters.Add(new NpgsqlParameter("@messagesSent", (object?)messagesSent ?? DBNull.Value));
            command.Parameters.Add(new NpgsqlParameter("@messagesReceived", (object?)messagesReceived ?? DBNull.Value));
            command.Parameters.Add(new NpgsqlParameter("@tokensUsed", (object?)tokensUsed ?? DBNull.Value));

            var result = await command.ExecuteScalarAsync(cancellationToken);
            var ended = result is bool b && b;

            if (ended)
            {
                _logger.LogInformation("Ended session {SessionId}", sessionId);
            }
            else
            {
                _logger.LogWarning("Session {SessionId} not found or already ended", sessionId);
            }

            return ended;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to end session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<ChatSession?> UpdateSessionMetricsAsync(
        string sessionId,
        int messagesSent = 0,
        int messagesReceived = 0,
        int tokensUsed = 0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var session = await GetByIdAsync(sessionId, cancellationToken);
            if (session == null || !session.IsActive)
                return null;

            session.MessagesSent += messagesSent;
            session.MessagesReceived += messagesReceived;
            session.TokensUsed += tokensUsed;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug(
                "Updated metrics for session {SessionId}: +{Sent} sent, +{Received} received, +{Tokens} tokens",
                sessionId, messagesSent, messagesReceived, tokensUsed);

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update metrics for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<UserSessionStats> GetUserStatsAsync(string userId, DateTime? since = null, CancellationToken cancellationToken = default)
    {
        try
        {
            // Use the database function for efficient stats calculation
            var sql = @"SELECT * FROM get_user_session_stats(@userId, @since)";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@userId", userId));
            command.Parameters.Add(new NpgsqlParameter("@since", (object?)since ?? DBNull.Value));

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                return new UserSessionStats
                {
                    TotalSessions = reader.IsDBNull(0) ? 0 : reader.GetInt64(0),
                    TotalMessagesSent = reader.IsDBNull(1) ? 0 : reader.GetInt64(1),
                    TotalMessagesReceived = reader.IsDBNull(2) ? 0 : reader.GetInt64(2),
                    TotalTokensUsed = reader.IsDBNull(3) ? 0 : reader.GetInt64(3),
                    AvgSessionDurationMinutes = reader.IsDBNull(4) ? 0 : (double)reader.GetDecimal(4),
                    UniqueConversations = reader.IsDBNull(5) ? 0 : reader.GetInt64(5),
                    FirstSessionAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                    LastSessionAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7)
                };
            }

            return new UserSessionStats();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get stats for user {UserId}", userId);
            throw;
        }
    }

    public async Task<UserSessionStats> GetGlobalStatsAsync(DateTime? since = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.ChatSessions.AsQueryable();

            if (since.HasValue)
            {
                query = query.Where(s => s.CreatedAt >= since.Value);
            }

            var stats = await query
                .GroupBy(_ => 1)
                .Select(g => new UserSessionStats
                {
                    TotalSessions = g.Count(),
                    TotalMessagesSent = g.Sum(s => s.MessagesSent),
                    TotalMessagesReceived = g.Sum(s => s.MessagesReceived),
                    TotalTokensUsed = g.Sum(s => s.TokensUsed),
                    UniqueConversations = g.Select(s => s.ConversationId).Distinct().Count(),
                    FirstSessionAt = g.Min(s => s.CreatedAt),
                    LastSessionAt = g.Max(s => s.CreatedAt)
                })
                .FirstOrDefaultAsync(cancellationToken);

            return stats ?? new UserSessionStats();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get global session stats");
            throw;
        }
    }

    public async Task<int> EndStaleSessions(TimeSpan olderThan, CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoff = DateTime.UtcNow - olderThan;

            // End sessions that have been active for too long
            var sql = @"
                UPDATE chat_sessions
                SET session_period = tstzrange(lower(session_period), NOW(), '[)')
                WHERE upper_inf(session_period)
                  AND lower(session_period) < @cutoff";

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@cutoff", cutoff));

            var count = await command.ExecuteNonQueryAsync(cancellationToken);

            if (count > 0)
            {
                _logger.LogInformation("Ended {Count} stale sessions older than {Duration}", count, olderThan);
            }

            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to end stale sessions");
            throw;
        }
    }

    public async Task<int> DeleteSessionsForConversationAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await _context.ChatSessions
                .Where(s => s.ConversationId == conversationId)
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Deleted {Count} sessions for conversation {ConversationId}", count, conversationId);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete sessions for conversation {ConversationId}", conversationId);
            throw;
        }
    }
}
