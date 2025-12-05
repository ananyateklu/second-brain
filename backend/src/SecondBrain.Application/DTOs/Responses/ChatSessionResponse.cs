namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response DTO for a chat session.
/// </summary>
public class ChatSessionResponse
{
    /// <summary>
    /// Session ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// User who owns this session.
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Conversation this session is for.
    /// </summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Whether the session is currently active.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// When the session started.
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When the session ended. Null if still active.
    /// </summary>
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// Session duration in minutes.
    /// </summary>
    public double DurationMinutes { get; set; }

    /// <summary>
    /// Number of messages sent by user.
    /// </summary>
    public int MessagesSent { get; set; }

    /// <summary>
    /// Number of messages received (AI responses).
    /// </summary>
    public int MessagesReceived { get; set; }

    /// <summary>
    /// Total tokens used in session.
    /// </summary>
    public int TokensUsed { get; set; }

    /// <summary>
    /// Device information (if available).
    /// </summary>
    public SessionDeviceInfoResponse? DeviceInfo { get; set; }

    /// <summary>
    /// When the session record was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response DTO for device information.
/// </summary>
public class SessionDeviceInfoResponse
{
    public string? Browser { get; set; }
    public string? BrowserVersion { get; set; }
    public string? OperatingSystem { get; set; }
    public string? DeviceType { get; set; }
    public string? Platform { get; set; }
    public bool? IsMobile { get; set; }
    public bool? IsDesktop { get; set; }
    public bool? IsTauriApp { get; set; }
}

/// <summary>
/// Response DTO for session statistics.
/// </summary>
public class SessionStatsResponse
{
    /// <summary>
    /// Total number of sessions.
    /// </summary>
    public long TotalSessions { get; set; }

    /// <summary>
    /// Total messages sent across all sessions.
    /// </summary>
    public long TotalMessagesSent { get; set; }

    /// <summary>
    /// Total messages received across all sessions.
    /// </summary>
    public long TotalMessagesReceived { get; set; }

    /// <summary>
    /// Total tokens used across all sessions.
    /// </summary>
    public long TotalTokensUsed { get; set; }

    /// <summary>
    /// Average session duration in minutes.
    /// </summary>
    public double AvgSessionDurationMinutes { get; set; }

    /// <summary>
    /// Number of unique conversations.
    /// </summary>
    public long UniqueConversations { get; set; }

    /// <summary>
    /// When the first session occurred.
    /// </summary>
    public DateTime? FirstSessionAt { get; set; }

    /// <summary>
    /// When the most recent session occurred.
    /// </summary>
    public DateTime? LastSessionAt { get; set; }

    /// <summary>
    /// Number of currently active sessions.
    /// </summary>
    public int ActiveSessions { get; set; }
}

/// <summary>
/// Request DTO for starting a session.
/// </summary>
public class StartSessionRequest
{
    /// <summary>
    /// Conversation ID to start session for.
    /// </summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Optional device information JSON.
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// Optional user agent string.
    /// </summary>
    public string? UserAgent { get; set; }
}

/// <summary>
/// Request DTO for ending a session.
/// </summary>
public class EndSessionRequest
{
    /// <summary>
    /// Final count of messages sent (optional).
    /// </summary>
    public int? MessagesSent { get; set; }

    /// <summary>
    /// Final count of messages received (optional).
    /// </summary>
    public int? MessagesReceived { get; set; }

    /// <summary>
    /// Total tokens used (optional).
    /// </summary>
    public int? TokensUsed { get; set; }
}

/// <summary>
/// Response DTO for session history listing.
/// </summary>
public class SessionHistoryResponse
{
    /// <summary>
    /// Conversation ID (if filtered by conversation).
    /// </summary>
    public string? ConversationId { get; set; }

    /// <summary>
    /// User ID (if filtered by user).
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// Total number of sessions.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// List of sessions.
    /// </summary>
    public List<ChatSessionResponse> Sessions { get; set; } = new();
}
