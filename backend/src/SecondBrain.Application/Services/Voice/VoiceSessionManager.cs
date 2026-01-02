using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using DbVoiceSession = SecondBrain.Core.Entities.VoiceSession;
using DbVoiceTurn = SecondBrain.Core.Entities.VoiceTurn;
using MemoryVoiceSession = SecondBrain.Application.Services.Voice.Models.VoiceSession;
using MemoryVoiceTurn = SecondBrain.Application.Services.Voice.Models.VoiceTurn;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Voice session manager with in-memory cache and database persistence.
/// Uses in-memory cache for real-time operations and persists to database for durability.
/// </summary>
public class VoiceSessionManager : IVoiceSessionManager
{
    private readonly ConcurrentDictionary<string, MemoryVoiceSession> _sessions = new();
    private readonly VoiceFeaturesConfig _features;
    private readonly IVoiceSessionRepository _repository;
    private readonly ILogger<VoiceSessionManager> _logger;

    public VoiceSessionManager(
        IOptions<VoiceSettings> voiceSettings,
        IVoiceSessionRepository repository,
        ILogger<VoiceSessionManager> logger)
    {
        _features = voiceSettings.Value.Features;
        _repository = repository;
        _logger = logger;
    }

    public async Task<MemoryVoiceSession> CreateSessionAsync(
        string userId,
        VoiceSessionOptions options,
        CancellationToken cancellationToken = default)
    {
        // Check if user has too many active sessions (check both in-memory and DB)
        var memoryActiveCount = _sessions.Values
            .Count(s => s.UserId == userId && s.IsActive);

        var dbActiveCount = await _repository.GetActiveSessionCountAsync(userId, cancellationToken);
        var totalActiveCount = Math.Max(memoryActiveCount, dbActiveCount);

        if (totalActiveCount >= _features.MaxConcurrentSessionsPerUser)
        {
            throw new InvalidOperationException(
                $"Maximum concurrent sessions ({_features.MaxConcurrentSessionsPerUser}) reached for user");
        }

        // Create UUIDv7 for time-ordered IDs
        var sessionId = Guid.CreateVersion7();

        // Persist to database first
        var dbSession = new DbVoiceSession
        {
            Id = sessionId,
            UserId = userId,
            Provider = options.Provider,
            Model = options.Model,
            Status = VoiceSessionStatus.Active,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            OptionsJson = JsonSerializer.Serialize(options)
        };

        try
        {
            await _repository.CreateAsync(dbSession, cancellationToken);
            _logger.LogDebug("Persisted voice session to database. SessionId: {SessionId}", sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist voice session to database. SessionId: {SessionId}. Continuing with in-memory only.", sessionId);
            // Continue with in-memory session even if DB persistence fails
        }

        // Create in-memory session for real-time operations
        var session = new MemoryVoiceSession
        {
            Id = sessionId.ToString(),
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

        return session;
    }

    public Task<MemoryVoiceSession?> GetSessionAsync(string sessionId)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }

    public Task<MemoryVoiceSession?> GetSessionForUserAsync(string sessionId, string userId)
    {
        if (_sessions.TryGetValue(sessionId, out var session) && session.UserId == userId)
        {
            return Task.FromResult<MemoryVoiceSession?>(session);
        }

        return Task.FromResult<MemoryVoiceSession?>(null);
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

    public async Task AddTurnAsync(string sessionId, MemoryVoiceTurn turn)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            // Add to in-memory session
            session.Turns.Add(turn);
            session.LastActivityAt = DateTime.UtcNow;

            _logger.LogDebug(
                "Added {Role} turn to session {SessionId}: {Content}",
                turn.Role, sessionId, turn.Content.Length > 50 ? turn.Content[..50] + "..." : turn.Content);

            // Persist turn to database
            if (Guid.TryParse(sessionId, out var sessionGuid))
            {
                var dbTurn = new DbVoiceTurn
                {
                    Id = Guid.CreateVersion7(),
                    SessionId = sessionGuid,
                    Role = turn.Role,
                    Content = turn.Content,
                    TranscriptText = turn.Content,
                    Timestamp = turn.Timestamp,
                    InputTokens = turn.TokenUsage?.InputTokens,
                    OutputTokens = turn.TokenUsage?.OutputTokens,
                    AudioDurationMs = turn.DurationSeconds.HasValue ? (int)(turn.DurationSeconds.Value * 1000) : null
                };

                try
                {
                    await _repository.AddTurnAsync(sessionGuid, dbTurn);
                    _logger.LogDebug("Persisted turn to database. SessionId: {SessionId}, TurnId: {TurnId}", sessionId, dbTurn.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to persist turn to database. SessionId: {SessionId}", sessionId);
                    // Continue even if DB persistence fails - turn is still in memory
                }
            }
        }
    }

    public Task TouchSessionAsync(string sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.LastActivityAt = DateTime.UtcNow;
        }

        return Task.CompletedTask;
    }

    public async Task EndSessionAsync(string sessionId)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.State = VoiceSessionState.Ended;
            session.EndedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Ended voice session {SessionId} for user {UserId} (duration: {Duration})",
                sessionId, session.UserId, session.Duration);

            // Update database
            if (Guid.TryParse(sessionId, out var sessionGuid))
            {
                try
                {
                    var dbSession = await _repository.GetByIdAsync(sessionGuid);
                    if (dbSession != null)
                    {
                        dbSession.Status = VoiceSessionStatus.Ended;
                        dbSession.EndedAt = session.EndedAt;

                        // Aggregate token counts from in-memory turns
                        dbSession.TotalInputTokens = session.Turns
                            .Where(t => t.TokenUsage != null)
                            .Sum(t => t.TokenUsage!.InputTokens);
                        dbSession.TotalOutputTokens = session.Turns
                            .Where(t => t.TokenUsage != null)
                            .Sum(t => t.TokenUsage!.OutputTokens);
                        dbSession.TotalAudioDurationMs = session.Turns
                            .Where(t => t.DurationSeconds.HasValue)
                            .Sum(t => (int)(t.DurationSeconds!.Value * 1000));

                        await _repository.UpdateAsync(dbSession);
                        _logger.LogDebug("Updated voice session in database. SessionId: {SessionId}, Status: {Status}",
                            sessionId, dbSession.Status);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to update voice session in database. SessionId: {SessionId}", sessionId);
                }
            }
        }
    }

    public Task<IReadOnlyList<MemoryVoiceSession>> GetActiveSessionsAsync(string userId)
    {
        var sessions = _sessions.Values
            .Where(s => s.UserId == userId && s.IsActive)
            .ToList();

        return Task.FromResult<IReadOnlyList<MemoryVoiceSession>>(sessions);
    }

    public Task<int> GetActiveSessionCountAsync(string userId)
    {
        var count = _sessions.Values
            .Count(s => s.UserId == userId && s.IsActive);

        return Task.FromResult(count);
    }

    public async Task<int> CleanupExpiredSessionsAsync(
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

        // Also cleanup in database
        try
        {
            var dbCleaned = await _repository.EndExpiredSessionsAsync(idleTimeoutMinutes, cancellationToken);
            if (dbCleaned > 0)
            {
                _logger.LogDebug("Cleaned up {Count} expired sessions in database", dbCleaned);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cleanup expired sessions in database");
        }

        // Remove very old ended sessions from memory (> 1 hour)
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
            _logger.LogDebug("Removed {Count} old ended sessions from memory", oldSessions.Count);
        }

        return cleaned;
    }
}
