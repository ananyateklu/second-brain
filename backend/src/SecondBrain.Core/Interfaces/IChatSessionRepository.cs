using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for chat session tracking operations.
/// Supports PostgreSQL 18 temporal queries with WITHOUT OVERLAPS constraints.
/// </summary>
public interface IChatSessionRepository
{
    /// <summary>
    /// Gets a session by ID.
    /// </summary>
    /// <param name="sessionId">The session ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The session or null</returns>
    Task<ChatSession?> GetByIdAsync(string sessionId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the currently active session for a user and conversation.
    /// Active sessions have an unbounded upper limit on their session_period.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="conversationId">The conversation ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The active session or null</returns>
    Task<ChatSession?> GetActiveSessionAsync(string userId, string conversationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all active sessions for a user.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of active sessions</returns>
    Task<List<ChatSession>> GetActiveSessionsForUserAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets session history for a conversation.
    /// </summary>
    /// <param name="conversationId">The conversation ID</param>
    /// <param name="skip">Number to skip</param>
    /// <param name="take">Number to take</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of sessions ordered by start time descending</returns>
    Task<List<ChatSession>> GetSessionHistoryAsync(string conversationId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all sessions for a user within a time range.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="since">Start of time range</param>
    /// <param name="until">End of time range (defaults to now)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of sessions</returns>
    Task<List<ChatSession>> GetUserSessionsAsync(string userId, DateTime since, DateTime? until = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Starts a new chat session.
    /// Automatically ends any existing active session for the same user+conversation.
    /// Uses the database function start_chat_session() for atomic operation.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="conversationId">The conversation ID</param>
    /// <param name="deviceInfo">Optional device information JSON</param>
    /// <param name="userAgent">Optional user agent string</param>
    /// <param name="ipAddress">Optional IP address</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The new session ID</returns>
    Task<string> StartSessionAsync(
        string userId,
        string conversationId,
        string? deviceInfo = null,
        string? userAgent = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ends an active session.
    /// Sets the upper bound of the session_period to now and updates metrics.
    /// </summary>
    /// <param name="sessionId">The session ID</param>
    /// <param name="messagesSent">Final count of messages sent</param>
    /// <param name="messagesReceived">Final count of messages received</param>
    /// <param name="tokensUsed">Total tokens used</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if session was ended, false if not found or already ended</returns>
    Task<bool> EndSessionAsync(
        string sessionId,
        int? messagesSent = null,
        int? messagesReceived = null,
        int? tokensUsed = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates session metrics without ending the session.
    /// </summary>
    /// <param name="sessionId">The session ID</param>
    /// <param name="messagesSent">Messages sent to add</param>
    /// <param name="messagesReceived">Messages received to add</param>
    /// <param name="tokensUsed">Tokens to add</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The updated session or null</returns>
    Task<ChatSession?> UpdateSessionMetricsAsync(
        string sessionId,
        int messagesSent = 0,
        int messagesReceived = 0,
        int tokensUsed = 0,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets aggregate session statistics for a user.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="since">Optional start date filter</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Session statistics</returns>
    Task<UserSessionStats> GetUserStatsAsync(string userId, DateTime? since = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets session statistics for all users (admin).
    /// </summary>
    /// <param name="since">Optional start date filter</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Aggregate statistics</returns>
    Task<UserSessionStats> GetGlobalStatsAsync(DateTime? since = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Ends all stale sessions (older than specified duration).
    /// Useful for cleanup of sessions that weren't properly closed.
    /// </summary>
    /// <param name="olderThan">Sessions active longer than this duration are ended</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of sessions ended</returns>
    Task<int> EndStaleSessions(TimeSpan olderThan, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes all sessions for a conversation.
    /// Should be called when a conversation is permanently deleted.
    /// </summary>
    /// <param name="conversationId">The conversation ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of sessions deleted</returns>
    Task<int> DeleteSessionsForConversationAsync(string conversationId, CancellationToken cancellationToken = default);
}
