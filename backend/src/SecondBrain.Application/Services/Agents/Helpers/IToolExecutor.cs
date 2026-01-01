using System.Reflection;
using System.Text.Json.Nodes;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Represents a pending tool call to be executed.
/// </summary>
public record PendingToolCall(
    string Id,
    string Name,
    string Arguments,
    JsonNode? ArgumentsNode = null);

/// <summary>
/// Result of a tool execution.
/// </summary>
public record ToolExecutionResult(
    string Id,
    string Name,
    string Arguments,
    string Result,
    bool Success);

/// <summary>
/// Context for configuring plugins during parallel execution.
/// Contains all the information needed to properly initialize a fresh plugin instance.
/// </summary>
public record PluginExecutionContext(
    string UserId,
    string? Provider = null,
    string? Model = null,
    bool AgentRagEnabled = true,
    RagOptions? RagOptions = null);

/// <summary>
/// Mapping of tool names to plugin types for scope-isolated execution.
/// </summary>
public record PluginTypeMapping(
    Type PluginType,
    string MethodName);

/// <summary>
/// Executes tool calls against registered plugins.
/// Handles both parallel and sequential execution based on configuration.
/// </summary>
public interface IToolExecutor
{
    /// <summary>
    /// Execute a single tool call.
    /// </summary>
    Task<ToolExecutionResult> ExecuteAsync(
        PendingToolCall toolCall,
        IAgentPlugin plugin,
        MethodInfo method,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute multiple tool calls.
    /// </summary>
    /// <param name="toolCalls">The tool calls to execute</param>
    /// <param name="pluginMethods">Mapping from tool name to plugin and method</param>
    /// <param name="parallelExecution">Whether to execute in parallel or sequentially</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<ToolExecutionResult[]> ExecuteMultipleAsync(
        IReadOnlyList<PendingToolCall> toolCalls,
        IReadOnlyDictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> pluginMethods,
        bool parallelExecution,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute multiple tool calls with scope isolation for parallel execution.
    /// Each parallel task gets its own DbContext scope to avoid threading issues.
    /// This is the preferred method for parallel database operations.
    /// </summary>
    /// <param name="toolCalls">The tool calls to execute</param>
    /// <param name="pluginMethods">Mapping from tool name to plugin and method (used for method info and plugin type)</param>
    /// <param name="executionContext">Context for configuring plugins (userId, provider, etc.)</param>
    /// <param name="parallelExecution">Whether to execute in parallel or sequentially</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<ToolExecutionResult[]> ExecuteMultipleWithScopeIsolationAsync(
        IReadOnlyList<PendingToolCall> toolCalls,
        IReadOnlyDictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> pluginMethods,
        PluginExecutionContext executionContext,
        bool parallelExecution,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate a deterministic tool ID from name and arguments.
    /// </summary>
    string GenerateToolId(string toolName, string arguments);
}
