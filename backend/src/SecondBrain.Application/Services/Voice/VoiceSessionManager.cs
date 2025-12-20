using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// In-memory voice session manager
/// </summary>
public class VoiceSessionManager : IVoiceSessionManager
{
    private readonly ConcurrentDictionary<string, VoiceSession> _sessions = new();
    private readonly VoiceFeaturesConfig _features;
    private readonly ILogger<VoiceSessionManager> _logger;

    public VoiceSessionManager(
        IOptions<VoiceSettings> voiceSettings,
        ILogger<VoiceSessionManager> logger)
    {
        _features = voiceSettings.Value.Features;
        _logger = logger;
    }

    public Task<VoiceSession> CreateSessionAsync(
        string userId,
        VoiceSessionOptions options,
        CancellationToken cancellationToken = default)
    {
        // Check if user has too many active sessions
        var activeCount = _sessions.Values
            .Count(s => s.UserId == userId && s.IsActive);

        if (activeCount >= _features.MaxConcurrentSessionsPerUser)
        {
            throw new InvalidOperationException(
                $"Maximum concurrent sessions ({_features.MaxConcurrentSessionsPerUser}) reached for user");
        }

        var session = new VoiceSession
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            State = VoiceSessionState.Idle,
            Provider = options.Provider,
            Model = options.Model,
            VoiceId = options.VoiceId,
            Options = options,
            StartedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow
        };

        if (!_sessions.TryAdd(session.Id, session))
        {
            throw new InvalidOperationException("Failed to create session");
        }

        _logger.LogInformation(
            "Created voice session {SessionId} for user {UserId} with provider {Provider}/{Model}",
            session.Id, userId, options.Provider, options.Model);

        return Task.FromResult(session);
    }

    public Task<VoiceSession?> GetSessionAsync(string sessionId)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }

    public Task<VoiceSession?> GetSessionForUserAsync(string sessionId, string userId)
    {
        if (_sessions.TryGetValue(sessionId, out var session) && session.UserId == userId)
        {
            return Task.FromResult<VoiceSession?>(session);
        }

        return Task.FromResult<VoiceSession?>(null);
    }

    public Task UpdateSessionStateAsync(
        string sessionId,
        VoiceSessionState state,
        string? reason = null)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            var oldState = session.State;
            session.State = state;
            session.LastActivityAt = DateTime.UtcNow;

            if (state == VoiceSessionState.Ended)
            {
                session.EndedAt = DateTime.UtcNow;
            }

            _logger.LogDebug(
                "Voice session {SessionId} state changed: {OldState} -> {NewState} (reason: {Reason})",
                sessionId, oldState, state, reason ?? "none");
        }

        return Task.CompletedTask;
    }

    public Task AddTurnAsync(string sessionId, VoiceTurn turn)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.Turns.Add(turn);
            session.LastActivityAt = DateTime.UtcNow;

            _logger.LogDebug(
                "Added {Role} turn to session {SessionId}: {Content}",
                turn.Role, sessionId, turn.Content.Length > 50 ? turn.Content[..50] + "..." : turn.Content);
        }

        return Task.CompletedTask;
    }

    public Task TouchSessionAsync(string sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.LastActivityAt = DateTime.UtcNow;
        }

        return Task.CompletedTask;
    }

    public Task EndSessionAsync(string sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.State = VoiceSessionState.Ended;
            session.EndedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Ended voice session {SessionId} for user {UserId} (duration: {Duration})",
                sessionId, session.UserId, session.Duration);
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<VoiceSession>> GetActiveSessionsAsync(string userId)
    {
        var sessions = _sessions.Values
            .Where(s => s.UserId == userId && s.IsActive)
            .ToList();

        return Task.FromResult<IReadOnlyList<VoiceSession>>(sessions);
    }

    public Task<int> GetActiveSessionCountAsync(string userId)
    {
        var count = _sessions.Values
            .Count(s => s.UserId == userId && s.IsActive);

        return Task.FromResult(count);
    }

    public Task<int> CleanupExpiredSessionsAsync(
        int idleTimeoutMinutes,
        CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-idleTimeoutMinutes);
        var expiredSessions = _sessions.Values
            .Where(s => s.IsActive && s.LastActivityAt < cutoff)
            .ToList();

        var cleaned = 0;

        foreach (var session in expiredSessions)
        {
            session.State = VoiceSessionState.Ended;
            session.EndedAt = DateTime.UtcNow;
            cleaned++;

            _logger.LogInformation(
                "Cleaned up idle voice session {SessionId} (idle since {LastActivity})",
                session.Id, session.LastActivityAt);
        }

        // Also remove very old ended sessions (> 1 hour)
        var oldCutoff = DateTime.UtcNow.AddHours(-1);
        var oldSessions = _sessions.Values
            .Where(s => !s.IsActive && s.EndedAt < oldCutoff)
            .Select(s => s.Id)
            .ToList();

        foreach (var sessionId in oldSessions)
        {
            _sessions.TryRemove(sessionId, out _);
        }

        if (oldSessions.Count > 0)
        {
            _logger.LogDebug("Removed {Count} old ended sessions", oldSessions.Count);
        }

        return Task.FromResult(cleaned);
    }
}
