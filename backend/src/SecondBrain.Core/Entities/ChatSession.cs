using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using NpgsqlTypes;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents a user's chat session with a conversation using PostgreSQL 18's temporal features.
/// The session_period column with WITHOUT OVERLAPS constraint ensures a user can only have
/// one active session per conversation at any given time.
/// </summary>
[Table("chat_sessions")]
public class ChatSession
{
    /// <summary>
    /// Unique identifier for the session.
    /// </summary>
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// User who owns this session.
    /// Part of the temporal unique constraint.
    /// </summary>
    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Conversation this session is for.
    /// Part of the temporal unique constraint.
    /// </summary>
    [Column("conversation_id")]
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// The time range during which this session was active.
    /// Uses PostgreSQL tstzrange with [) bounds (inclusive start, exclusive end).
    /// Active sessions have an unbounded (null) upper limit.
    /// Part of the temporal unique constraint with WITHOUT OVERLAPS.
    /// </summary>
    [Column("session_period")]
    public NpgsqlRange<DateTime> SessionPeriod { get; set; }

    /// <summary>
    /// Device/client information stored as JSON.
    /// Can include browser, OS, device type, etc.
    /// </summary>
    [Column("device_info", TypeName = "jsonb")]
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// User agent string from the client.
    /// </summary>
    [Column("user_agent")]
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// IP address of the client.
    /// </summary>
    [Column("ip_address")]
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// Number of messages sent by the user during this session.
    /// </summary>
    [Column("messages_sent")]
    public int MessagesSent { get; set; }

    /// <summary>
    /// Number of messages received (AI responses) during this session.
    /// </summary>
    [Column("messages_received")]
    public int MessagesReceived { get; set; }

    /// <summary>
    /// Total tokens used during this session.
    /// </summary>
    [Column("tokens_used")]
    public int TokensUsed { get; set; }

    /// <summary>
    /// When this session record was created.
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("ConversationId")]
    [JsonIgnore]
    public ChatConversation? Conversation { get; set; }

    // Computed properties for convenience

    /// <summary>
    /// Gets the start time of this session.
    /// </summary>
    [NotMapped]
    public DateTime StartedAt => SessionPeriod.LowerBound;

    /// <summary>
    /// Gets the end time of this session.
    /// Null indicates the session is still active.
    /// </summary>
    [NotMapped]
    public DateTime? EndedAt => IsActive ? null : SessionPeriod.UpperBound;

    /// <summary>
    /// Returns true if this session is currently active.
    /// Active sessions have an unbounded upper limit (DateTime.MaxValue or infinite).
    /// </summary>
    [NotMapped]
    public bool IsActive => SessionPeriod.UpperBoundInfinite || SessionPeriod.UpperBound >= DateTime.MaxValue.AddYears(-1);

    /// <summary>
    /// Gets the duration of the session.
    /// For active sessions, calculates duration from start to now.
    /// </summary>
    [NotMapped]
    public TimeSpan Duration => (EndedAt ?? DateTime.UtcNow) - StartedAt;

    /// <summary>
    /// Creates a new active session.
    /// </summary>
    public static ChatSession CreateNew(
        string userId,
        string conversationId,
        string? deviceInfo = null,
        string? userAgent = null,
        string? ipAddress = null)
    {
        return new ChatSession
        {
            Id = Guid.CreateVersion7().ToString(),
            UserId = userId,
            ConversationId = conversationId,
            SessionPeriod = CreateOpenEndedRange(DateTime.UtcNow),
            DeviceInfo = deviceInfo,
            UserAgent = userAgent,
            IpAddress = ipAddress,
            MessagesSent = 0,
            MessagesReceived = 0,
            TokensUsed = 0,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Ends the session by setting the upper bound to now.
    /// </summary>
    public void End()
    {
        var endTime = DateTime.UtcNow;
        SessionPeriod = new NpgsqlRange<DateTime>(SessionPeriod.LowerBound, endTime);
    }

    /// <summary>
    /// Creates an open-ended range (starting at given time, no end).
    /// For PostgreSQL this represents [start, infinity).
    /// </summary>
    private static NpgsqlRange<DateTime> CreateOpenEndedRange(DateTime start)
    {
        // Use DateTime.MaxValue as a sentinel for "unbounded"
        // The database handles actual infinity via tstzrange(start, NULL, '[)')
        return new NpgsqlRange<DateTime>(start, DateTime.MaxValue);
    }

    /// <summary>
    /// Increments the message counters and tokens used.
    /// </summary>
    public void RecordActivity(int sentCount = 0, int receivedCount = 0, int tokens = 0)
    {
        MessagesSent += sentCount;
        MessagesReceived += receivedCount;
        TokensUsed += tokens;
    }
}

/// <summary>
/// Device information structure for chat sessions.
/// </summary>
public class SessionDeviceInfo
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
/// Aggregate session statistics for a user.
/// </summary>
public class UserSessionStats
{
    public long TotalSessions { get; set; }
    public long TotalMessagesSent { get; set; }
    public long TotalMessagesReceived { get; set; }
    public long TotalTokensUsed { get; set; }
    public double AvgSessionDurationMinutes { get; set; }
    public long UniqueConversations { get; set; }
    public DateTime? FirstSessionAt { get; set; }
    public DateTime? LastSessionAt { get; set; }
}
