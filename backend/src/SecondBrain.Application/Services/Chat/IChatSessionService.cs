using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Application.Services.Chat;

/// <summary>
/// Service interface for chat session tracking operations.
/// Provides session lifecycle management and analytics.
/// </summary>
public interface IChatSessionService
{
    /// <summary>
    /// Gets a session by ID.
    /// </summary>
    Task<ChatSessionResponse?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the currently active session for a user and conversation.
    /// </summary>
    Task<ChatSessionResponse?> GetActiveSessionAsync(string userId, string conversationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all active sessions for a user.
    /// </summary>
    Task<List<ChatSessionResponse>> GetActiveSessionsAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Starts a new chat session.
    /// Automatically ends any existing active session for the same user+conversation.
    /// </summary>
    Task<ChatSessionResponse> StartSessionAsync(
        string userId,
        string conversationId,
        string? deviceInfo = null,
        string? userAgent = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ends an active session.
    /// </summary>
    Task<bool> EndSessionAsync(
        string sessionId,
        int? messagesSent = null,
        int? messagesReceived = null,
        int? tokensUsed = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates session metrics without ending the session.
    /// </summary>
    Task<ChatSessionResponse?> UpdateSessionMetricsAsync(
        string sessionId,
        int messagesSent = 0,
        int messagesReceived = 0,
        int tokensUsed = 0,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets session history for a conversation.
    /// </summary>
    Task<SessionHistoryResponse> GetConversationSessionHistoryAsync(
        string conversationId,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets sessions for a user within a time range.
    /// </summary>
    Task<SessionHistoryResponse> GetUserSessionHistoryAsync(
        string userId,
        DateTime since,
        DateTime? until = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets session statistics for a user.
    /// </summary>
    Task<SessionStatsResponse> GetUserStatsAsync(string userId, DateTime? since = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets global session statistics.
    /// </summary>
    Task<SessionStatsResponse> GetGlobalStatsAsync(DateTime? since = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Ends stale sessions that have been active for too long.
    /// </summary>
    Task<int> EndStaleSessionsAsync(TimeSpan olderThan, CancellationToken cancellationToken = default);
}
