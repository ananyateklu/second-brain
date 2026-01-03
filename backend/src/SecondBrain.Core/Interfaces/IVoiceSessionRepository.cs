using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for voice session persistence and retrieval.
/// Supports session CRUD, turn management, and paginated history queries.
/// </summary>
public interface IVoiceSessionRepository
{
    // Session CRUD
    /// <summary>
    /// Creates a new voice session in the database.
    /// </summary>
    Task<VoiceSession> CreateAsync(VoiceSession session, CancellationToken ct = default);

    /// <summary>
    /// Gets a session by ID without user verification.
    /// </summary>
    Task<VoiceSession?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets a session by ID with user ownership verification.
    /// </summary>
    Task<VoiceSession?> GetByIdForUserAsync(Guid id, string userId, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing voice session.
    /// </summary>
    Task<VoiceSession> UpdateAsync(VoiceSession session, CancellationToken ct = default);

    /// <summary>
    /// Deletes a voice session and its turns.
    /// </summary>
    Task<bool> DeleteAsync(Guid id, string userId, CancellationToken ct = default);

    // Turn operations
    /// <summary>
    /// Adds a turn to an existing session.
    /// </summary>
    Task<VoiceTurn> AddTurnAsync(Guid sessionId, VoiceTurn turn, CancellationToken ct = default);

    // History queries
    /// <summary>
    /// Gets paginated session history for a user.
    /// Returns sessions without turns for list display.
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="pageSize">Number of items per page</param>
    /// <param name="status">Optional status filter (active, ended, error)</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Tuple of (sessions, totalCount)</returns>
    Task<(IEnumerable<VoiceSession> Items, int TotalCount)> GetSessionsPagedAsync(
        string userId,
        int page,
        int pageSize,
        string? status = null,
        CancellationToken ct = default);

    /// <summary>
    /// Gets a session with all its turns for transcript display.
    /// Turns are ordered by timestamp ascending.
    /// </summary>
    Task<VoiceSession?> GetSessionWithTurnsAsync(Guid id, string userId, CancellationToken ct = default);

    /// <summary>
    /// Gets the first user message from a session for preview display.
    /// </summary>
    Task<string?> GetFirstUserMessageAsync(Guid sessionId, CancellationToken ct = default);

    // Active session queries
    /// <summary>
    /// Gets all active sessions for a user.
    /// </summary>
    Task<IEnumerable<VoiceSession>> GetActiveSessionsAsync(string userId, CancellationToken ct = default);

    /// <summary>
    /// Gets count of active sessions for a user.
    /// </summary>
    Task<int> GetActiveSessionCountAsync(string userId, CancellationToken ct = default);

    /// <summary>
    /// Checks if a session exists and belongs to the specified user.
    /// Uses compiled query for optimal performance.
    /// </summary>
    Task<bool> ExistsForUserAsync(Guid sessionId, string userId, CancellationToken ct = default);

    // Cleanup and maintenance
    /// <summary>
    /// Ends sessions that have been idle for longer than the specified timeout.
    /// Returns number of sessions ended.
    /// </summary>
    Task<int> EndExpiredSessionsAsync(int idleTimeoutMinutes, CancellationToken ct = default);
}
