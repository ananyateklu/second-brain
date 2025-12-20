using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Manages voice conversation sessions
/// </summary>
public interface IVoiceSessionManager
{
    /// <summary>
    /// Create a new voice session
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="options">Session options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created session</returns>
    Task<VoiceSession> CreateSessionAsync(
        string userId,
        VoiceSessionOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a session by ID
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    /// <returns>Session if found, null otherwise</returns>
    Task<VoiceSession?> GetSessionAsync(string sessionId);

    /// <summary>
    /// Get a session by ID, verifying user ownership
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    /// <param name="userId">User ID for ownership check</param>
    /// <returns>Session if found and owned by user, null otherwise</returns>
    Task<VoiceSession?> GetSessionForUserAsync(string sessionId, string userId);

    /// <summary>
    /// Update session state
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    /// <param name="state">New state</param>
    /// <param name="reason">Reason for state change</param>
    Task UpdateSessionStateAsync(
        string sessionId,
        VoiceSessionState state,
        string? reason = null);

    /// <summary>
    /// Add a turn to the session
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    /// <param name="turn">The turn to add</param>
    Task AddTurnAsync(string sessionId, VoiceTurn turn);

    /// <summary>
    /// Update the last activity timestamp for a session
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    Task TouchSessionAsync(string sessionId);

    /// <summary>
    /// End a session
    /// </summary>
    /// <param name="sessionId">Session ID</param>
    Task EndSessionAsync(string sessionId);

    /// <summary>
    /// Get all active sessions for a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>List of active sessions</returns>
    Task<IReadOnlyList<VoiceSession>> GetActiveSessionsAsync(string userId);

    /// <summary>
    /// Get count of active sessions for a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <returns>Number of active sessions</returns>
    Task<int> GetActiveSessionCountAsync(string userId);

    /// <summary>
    /// Clean up expired/idle sessions
    /// </summary>
    /// <param name="idleTimeoutMinutes">Idle timeout in minutes</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of sessions cleaned up</returns>
    Task<int> CleanupExpiredSessionsAsync(
        int idleTimeoutMinutes,
        CancellationToken cancellationToken = default);
}
