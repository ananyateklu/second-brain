namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Comprehensive analytics response for agent tool call executions.
/// Uses PostgreSQL 18 JSON_TABLE for efficient JSONB analysis.
/// </summary>
public class ToolCallAnalyticsResponse
{
    /// <summary>
    /// Total number of tool calls across all conversations
    /// </summary>
    public int TotalToolCalls { get; set; }

    /// <summary>
    /// Overall success rate as a percentage (0-100)
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Average execution time in milliseconds
    /// </summary>
    public double AverageExecutionTimeMs { get; set; }

    /// <summary>
    /// Tool usage breakdown by tool name
    /// </summary>
    public List<ToolUsageStats> ToolUsageByName { get; set; } = new();

    /// <summary>
    /// Tool usage breakdown by action type (from arguments.action)
    /// </summary>
    public List<ToolActionStats> ToolUsageByAction { get; set; } = new();

    /// <summary>
    /// Daily tool call counts (date string -> count)
    /// </summary>
    public Dictionary<string, int> DailyToolCalls { get; set; } = new();

    /// <summary>
    /// Daily success rates (date string -> rate)
    /// </summary>
    public Dictionary<string, double> DailySuccessRates { get; set; } = new();

    /// <summary>
    /// Top error patterns from failed tool calls
    /// </summary>
    public List<ToolErrorStats> TopErrors { get; set; } = new();

    /// <summary>
    /// Tool usage by hour of day (0-23 -> count)
    /// </summary>
    public Dictionary<int, int> HourlyDistribution { get; set; } = new();
}

/// <summary>
/// Statistics for a specific tool
/// </summary>
public class ToolUsageStats
{
    /// <summary>
    /// Name of the tool (e.g., "notes_tool")
    /// </summary>
    public string ToolName { get; set; } = string.Empty;

    /// <summary>
    /// Total number of calls to this tool
    /// </summary>
    public int CallCount { get; set; }

    /// <summary>
    /// Number of successful calls
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of failed calls
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Success rate as a percentage (0-100)
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Percentage of total tool calls
    /// </summary>
    public double PercentageOfTotal { get; set; }

    /// <summary>
    /// First time this tool was called
    /// </summary>
    public DateTime? FirstUsed { get; set; }

    /// <summary>
    /// Most recent time this tool was called
    /// </summary>
    public DateTime? LastUsed { get; set; }
}

/// <summary>
/// Statistics for a specific tool action
/// </summary>
public class ToolActionStats
{
    /// <summary>
    /// Name of the tool
    /// </summary>
    public string ToolName { get; set; } = string.Empty;

    /// <summary>
    /// Action type (e.g., "get_note", "create_note", "search_notes")
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// Total number of calls with this action
    /// </summary>
    public int CallCount { get; set; }

    /// <summary>
    /// Number of successful calls
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Success rate as a percentage (0-100)
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Percentage of calls for this tool
    /// </summary>
    public double PercentageOfTool { get; set; }
}

/// <summary>
/// Statistics for tool call errors
/// </summary>
public class ToolErrorStats
{
    /// <summary>
    /// Name of the tool that failed
    /// </summary>
    public string ToolName { get; set; } = string.Empty;

    /// <summary>
    /// Error type or category
    /// </summary>
    public string ErrorType { get; set; } = string.Empty;

    /// <summary>
    /// Error message or description
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// Number of occurrences of this error
    /// </summary>
    public int OccurrenceCount { get; set; }

    /// <summary>
    /// First occurrence of this error
    /// </summary>
    public DateTime? FirstOccurrence { get; set; }

    /// <summary>
    /// Most recent occurrence of this error
    /// </summary>
    public DateTime? LastOccurrence { get; set; }
}

/// <summary>
/// Request parameters for filtering tool call analytics
/// </summary>
public class ToolCallAnalyticsRequest
{
    /// <summary>
    /// Start date for the analytics period (optional)
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// End date for the analytics period (optional)
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Filter by specific tool name (optional)
    /// </summary>
    public string? ToolName { get; set; }

    /// <summary>
    /// Filter by specific action (optional)
    /// </summary>
    public string? Action { get; set; }

    /// <summary>
    /// Number of days to look back (default: 30)
    /// </summary>
    public int DaysBack { get; set; } = 30;
}
