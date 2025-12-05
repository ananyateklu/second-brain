using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// Repository for tool call analytics using PostgreSQL 18 JSON_TABLE.
/// Provides efficient JSONB querying for agent tool execution analysis.
/// </summary>
public class SqlToolCallAnalyticsRepository : IToolCallAnalyticsRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlToolCallAnalyticsRepository> _logger;

    public SqlToolCallAnalyticsRepository(
        ApplicationDbContext context,
        ILogger<SqlToolCallAnalyticsRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ToolCallOverallStats> GetOverallStatsAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting overall tool call stats. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            var sql = $@"
                SELECT 
                    COUNT(*)::int AS total_calls,
                    SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::int AS successful_calls,
                    SUM(CASE WHEN NOT tc.success THEN 1 ELSE 0 END)::int AS failed_calls,
                    COALESCE(
                        ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
                        0
                    ) AS success_rate,
                    0 AS avg_execution_time_ms  -- Placeholder as we don't track execution time yet
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                return new ToolCallOverallStats(
                    TotalCalls: reader.GetInt32(0),
                    SuccessfulCalls: reader.GetInt32(1),
                    FailedCalls: reader.GetInt32(2),
                    SuccessRate: reader.GetDouble(3),
                    AverageExecutionTimeMs: reader.GetDouble(4));
            }

            return new ToolCallOverallStats(0, 0, 0, 0, 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting overall tool call stats. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve overall tool call statistics", ex);
        }
    }

    public async Task<List<ToolUsageByNameResult>> GetToolUsageByNameAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting tool usage by name. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            var sql = $@"
                SELECT 
                    tc.tool_name,
                    COUNT(*)::int AS call_count,
                    SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::int AS success_count,
                    SUM(CASE WHEN NOT tc.success THEN 1 ELSE 0 END)::int AS failure_count,
                    COALESCE(
                        ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
                        0
                    ) AS success_rate,
                    MIN(tc.executed_at) AS first_used,
                    MAX(tc.executed_at) AS last_used
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}
                GROUP BY tc.tool_name
                ORDER BY call_count DESC";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new List<ToolUsageByNameResult>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(new ToolUsageByNameResult(
                    ToolName: reader.GetString(0),
                    CallCount: reader.GetInt32(1),
                    SuccessCount: reader.GetInt32(2),
                    FailureCount: reader.GetInt32(3),
                    SuccessRate: reader.GetDouble(4),
                    FirstUsed: reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                    LastUsed: reader.IsDBNull(6) ? null : reader.GetDateTime(6)));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tool usage by name. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve tool usage by name", ex);
        }
    }

    public async Task<List<ToolUsageByActionResult>> GetToolUsageByActionAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting tool usage by action using JSON_TABLE. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            // PostgreSQL 18 JSON_TABLE query to extract action from arguments_jsonb
            var sql = $@"
                SELECT 
                    tc.tool_name,
                    COALESCE(jt.action, 'unknown') AS action,
                    COUNT(*)::int AS call_count,
                    SUM(CASE WHEN tc.success THEN 1 ELSE 0 END)::int AS success_count,
                    COALESCE(
                        ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
                        0
                    ) AS success_rate
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
                JSON_TABLE(
                    COALESCE(tc.arguments_jsonb, '{{}}'::jsonb),
                    '$'
                    COLUMNS (
                        action TEXT PATH '$.action'
                    )
                ) AS jt
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}
                GROUP BY tc.tool_name, jt.action
                ORDER BY tc.tool_name, call_count DESC";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new List<ToolUsageByActionResult>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(new ToolUsageByActionResult(
                    ToolName: reader.GetString(0),
                    Action: reader.GetString(1),
                    CallCount: reader.GetInt32(2),
                    SuccessCount: reader.GetInt32(3),
                    SuccessRate: reader.GetDouble(4)));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tool usage by action. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve tool usage by action", ex);
        }
    }

    public async Task<Dictionary<string, int>> GetDailyToolCallsAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting daily tool calls. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            var sql = $@"
                SELECT 
                    DATE(tc.executed_at) AS call_date,
                    COUNT(*)::int AS call_count
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}
                GROUP BY DATE(tc.executed_at)
                ORDER BY call_date ASC";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new Dictionary<string, int>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var date = reader.GetDateTime(0).ToString("yyyy-MM-dd");
                var count = reader.GetInt32(1);
                results[date] = count;
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily tool calls. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve daily tool calls", ex);
        }
    }

    public async Task<Dictionary<string, double>> GetDailySuccessRatesAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting daily success rates. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            var sql = $@"
                SELECT 
                    DATE(tc.executed_at) AS call_date,
                    COALESCE(
                        ROUND(100.0 * SUM(CASE WHEN tc.success THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
                        0
                    ) AS success_rate
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}
                GROUP BY DATE(tc.executed_at)
                ORDER BY call_date ASC";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new Dictionary<string, double>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var date = reader.GetDateTime(0).ToString("yyyy-MM-dd");
                var rate = reader.GetDouble(1);
                results[date] = rate;
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily success rates. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve daily success rates", ex);
        }
    }

    public async Task<List<ToolErrorResult>> GetTopErrorsAsync(
        string userId,
        int topN = 10,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting top errors using JSON_TABLE. UserId: {UserId}, TopN: {TopN}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, topN, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);
            parameters.Add(new NpgsqlParameter("@topN", topN));

            // PostgreSQL 18 JSON_TABLE to extract error details from result_jsonb
            var sql = $@"
                SELECT 
                    tc.tool_name,
                    COALESCE(jt.error_type, 'Unknown') AS error_type,
                    COALESCE(jt.error_message, LEFT(tc.result, 200)) AS error_message,
                    COUNT(*)::int AS occurrence_count,
                    MIN(tc.executed_at) AS first_occurrence,
                    MAX(tc.executed_at) AS last_occurrence
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id,
                JSON_TABLE(
                    COALESCE(tc.result_jsonb, '{{}}'::jsonb),
                    '$'
                    COLUMNS (
                        error_type TEXT PATH '$.errorType',
                        error_message TEXT PATH '$.error',
                        error_alt TEXT PATH '$.message'
                    )
                ) AS jt
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  AND NOT tc.success
                  {dateFilter}
                GROUP BY tc.tool_name, jt.error_type, jt.error_message, tc.result
                ORDER BY occurrence_count DESC
                LIMIT @topN";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new List<ToolErrorResult>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(new ToolErrorResult(
                    ToolName: reader.GetString(0),
                    ErrorType: reader.GetString(1),
                    ErrorMessage: reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    OccurrenceCount: reader.GetInt32(3),
                    FirstOccurrence: reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                    LastOccurrence: reader.IsDBNull(5) ? null : reader.GetDateTime(5)));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top errors. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve top errors", ex);
        }
    }

    public async Task<Dictionary<int, int>> GetHourlyDistributionAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Getting hourly distribution. UserId: {UserId}, StartDate: {StartDate}, EndDate: {EndDate}",
                userId, startDate, endDate);

            var (dateFilter, parameters) = BuildDateFilter(userId, startDate, endDate);

            var sql = $@"
                SELECT 
                    EXTRACT(HOUR FROM tc.executed_at)::int AS hour_of_day,
                    COUNT(*)::int AS call_count
                FROM tool_calls tc
                INNER JOIN chat_messages cm ON tc.message_id = cm.id
                INNER JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE cc.user_id = @userId
                  AND NOT cc.is_deleted
                  {dateFilter}
                GROUP BY EXTRACT(HOUR FROM tc.executed_at)
                ORDER BY hour_of_day ASC";

            var connection = _context.Database.GetDbConnection();
            await EnsureConnectionOpenAsync(connection, cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.AddRange(parameters.ToArray());

            var results = new Dictionary<int, int>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var hour = reader.GetInt32(0);
                var count = reader.GetInt32(1);
                results[hour] = count;
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting hourly distribution. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve hourly distribution", ex);
        }
    }

    #region Helper Methods

    private static (string dateFilter, List<NpgsqlParameter> parameters) BuildDateFilter(
        string userId,
        DateTime? startDate,
        DateTime? endDate)
    {
        var parameters = new List<NpgsqlParameter>
        {
            new("@userId", userId)
        };

        var filters = new List<string>();

        if (startDate.HasValue)
        {
            filters.Add("AND tc.executed_at >= @startDate");
            parameters.Add(new NpgsqlParameter("@startDate", startDate.Value));
        }

        if (endDate.HasValue)
        {
            filters.Add("AND tc.executed_at <= @endDate");
            parameters.Add(new NpgsqlParameter("@endDate", endDate.Value));
        }

        return (string.Join(" ", filters), parameters);
    }

    private static async Task EnsureConnectionOpenAsync(
        System.Data.Common.DbConnection connection,
        CancellationToken cancellationToken)
    {
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }
    }

    #endregion
}
