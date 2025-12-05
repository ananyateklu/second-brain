using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Chat;

/// <summary>
/// Service implementation for chat session tracking.
/// Uses PostgreSQL 18 temporal features via the repository layer.
/// </summary>
public class ChatSessionService : IChatSessionService
{
    private readonly IChatSessionRepository _repository;
    private readonly ILogger<ChatSessionService> _logger;

    public ChatSessionService(
        IChatSessionRepository repository,
        ILogger<ChatSessionService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<ChatSessionResponse?> GetSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId, cancellationToken);
        return session != null ? MapToResponse(session) : null;
    }

    public async Task<ChatSessionResponse?> GetActiveSessionAsync(string userId, string conversationId, CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetActiveSessionAsync(userId, conversationId, cancellationToken);
        return session != null ? MapToResponse(session) : null;
    }

    public async Task<List<ChatSessionResponse>> GetActiveSessionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var sessions = await _repository.GetActiveSessionsForUserAsync(userId, cancellationToken);
        return sessions.Select(MapToResponse).ToList();
    }

    public async Task<ChatSessionResponse> StartSessionAsync(
        string userId,
        string conversationId,
        string? deviceInfo = null,
        string? userAgent = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Starting session for user {UserId} on conversation {ConversationId}",
            userId, conversationId);

        var sessionId = await _repository.StartSessionAsync(
            userId, conversationId, deviceInfo, userAgent, ipAddress, cancellationToken);

        var session = await _repository.GetByIdAsync(sessionId, cancellationToken);
        if (session == null)
        {
            throw new InvalidOperationException($"Failed to retrieve created session {sessionId}");
        }

        return MapToResponse(session);
    }

    public async Task<bool> EndSessionAsync(
        string sessionId,
        int? messagesSent = null,
        int? messagesReceived = null,
        int? tokensUsed = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Ending session {SessionId}", sessionId);
        return await _repository.EndSessionAsync(sessionId, messagesSent, messagesReceived, tokensUsed, cancellationToken);
    }

    public async Task<ChatSessionResponse?> UpdateSessionMetricsAsync(
        string sessionId,
        int messagesSent = 0,
        int messagesReceived = 0,
        int tokensUsed = 0,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.UpdateSessionMetricsAsync(
            sessionId, messagesSent, messagesReceived, tokensUsed, cancellationToken);
        return session != null ? MapToResponse(session) : null;
    }

    public async Task<SessionHistoryResponse> GetConversationSessionHistoryAsync(
        string conversationId,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var sessions = await _repository.GetSessionHistoryAsync(conversationId, skip, take, cancellationToken);

        return new SessionHistoryResponse
        {
            ConversationId = conversationId,
            TotalCount = sessions.Count,
            Sessions = sessions.Select(MapToResponse).ToList()
        };
    }

    public async Task<SessionHistoryResponse> GetUserSessionHistoryAsync(
        string userId,
        DateTime since,
        DateTime? until = null,
        CancellationToken cancellationToken = default)
    {
        var sessions = await _repository.GetUserSessionsAsync(userId, since, until, cancellationToken);

        return new SessionHistoryResponse
        {
            UserId = userId,
            TotalCount = sessions.Count,
            Sessions = sessions.Select(MapToResponse).ToList()
        };
    }

    public async Task<SessionStatsResponse> GetUserStatsAsync(string userId, DateTime? since = null, CancellationToken cancellationToken = default)
    {
        var stats = await _repository.GetUserStatsAsync(userId, since, cancellationToken);
        var activeSessions = await _repository.GetActiveSessionsForUserAsync(userId, cancellationToken);

        return new SessionStatsResponse
        {
            TotalSessions = stats.TotalSessions,
            TotalMessagesSent = stats.TotalMessagesSent,
            TotalMessagesReceived = stats.TotalMessagesReceived,
            TotalTokensUsed = stats.TotalTokensUsed,
            AvgSessionDurationMinutes = stats.AvgSessionDurationMinutes,
            UniqueConversations = stats.UniqueConversations,
            FirstSessionAt = stats.FirstSessionAt,
            LastSessionAt = stats.LastSessionAt,
            ActiveSessions = activeSessions.Count
        };
    }

    public async Task<SessionStatsResponse> GetGlobalStatsAsync(DateTime? since = null, CancellationToken cancellationToken = default)
    {
        var stats = await _repository.GetGlobalStatsAsync(since, cancellationToken);

        return new SessionStatsResponse
        {
            TotalSessions = stats.TotalSessions,
            TotalMessagesSent = stats.TotalMessagesSent,
            TotalMessagesReceived = stats.TotalMessagesReceived,
            TotalTokensUsed = stats.TotalTokensUsed,
            AvgSessionDurationMinutes = stats.AvgSessionDurationMinutes,
            UniqueConversations = stats.UniqueConversations,
            FirstSessionAt = stats.FirstSessionAt,
            LastSessionAt = stats.LastSessionAt
        };
    }

    public async Task<int> EndStaleSessionsAsync(TimeSpan olderThan, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Ending stale sessions older than {Duration}", olderThan);
        return await _repository.EndStaleSessions(olderThan, cancellationToken);
    }

    private ChatSessionResponse MapToResponse(ChatSession session)
    {
        SessionDeviceInfoResponse? deviceInfo = null;

        if (!string.IsNullOrEmpty(session.DeviceInfo))
        {
            try
            {
                var info = JsonSerializer.Deserialize<SessionDeviceInfo>(session.DeviceInfo);
                if (info != null)
                {
                    deviceInfo = new SessionDeviceInfoResponse
                    {
                        Browser = info.Browser,
                        BrowserVersion = info.BrowserVersion,
                        OperatingSystem = info.OperatingSystem,
                        DeviceType = info.DeviceType,
                        Platform = info.Platform,
                        IsMobile = info.IsMobile,
                        IsDesktop = info.IsDesktop,
                        IsTauriApp = info.IsTauriApp
                    };
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize device info for session {SessionId}", session.Id);
            }
        }

        return new ChatSessionResponse
        {
            Id = session.Id,
            UserId = session.UserId,
            ConversationId = session.ConversationId,
            IsActive = session.IsActive,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,
            DurationMinutes = session.Duration.TotalMinutes,
            MessagesSent = session.MessagesSent,
            MessagesReceived = session.MessagesReceived,
            TokensUsed = session.TokensUsed,
            DeviceInfo = deviceInfo,
            CreatedAt = session.CreatedAt
        };
    }
}
