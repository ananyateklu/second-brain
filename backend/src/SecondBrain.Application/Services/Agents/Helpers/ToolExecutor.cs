using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Agents.Plugins;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Executes tool calls against registered plugins.
/// </summary>
public class ToolExecutor : IToolExecutor
{
    private readonly ILogger<ToolExecutor> _logger;

    // Common parameter name aliases that AI models might use
    private static readonly Dictionary<string, string[]> ParameterAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        { "content", new[] { "body", "text", "note_content", "noteContent", "message" } },
        { "title", new[] { "name", "heading", "subject" } },
        { "query", new[] { "search", "searchQuery", "search_query", "q" } },
        { "tags", new[] { "labels", "categories", "tag" } },
        { "noteId", new[] { "note_id", "id", "noteID" } },
        { "contentToAppend", new[] { "content_to_append", "appendContent", "append_content", "newContent", "new_content" } }
    };

    public ToolExecutor(ILogger<ToolExecutor> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ToolExecutionResult> ExecuteAsync(
        PendingToolCall toolCall,
        IAgentPlugin plugin,
        MethodInfo method,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Executing tool {ToolName} via plugin {PluginName}",
                toolCall.Name, plugin.GetPluginName());

            var result = await InvokePluginMethodAsync(plugin, method, toolCall.ArgumentsNode);

            _logger.LogDebug("Tool {ToolName} execution result: {Result}", toolCall.Name, result);

            return new ToolExecutionResult(
                toolCall.Id,
                toolCall.Name,
                toolCall.Arguments,
                result,
                Success: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing tool {ToolName}", toolCall.Name);
            return new ToolExecutionResult(
                toolCall.Id,
                toolCall.Name,
                toolCall.Arguments,
                $"Error executing tool: {ex.Message}",
                Success: false);
        }
    }

    /// <inheritdoc />
    public async Task<ToolExecutionResult[]> ExecuteMultipleAsync(
        IReadOnlyList<PendingToolCall> toolCalls,
        IReadOnlyDictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> pluginMethods,
        bool parallelExecution,
        CancellationToken cancellationToken = default)
    {
        if (parallelExecution)
        {
            // Parallel execution - start all tasks at once
            var executionTasks = toolCalls.Select(async call =>
            {
                if (pluginMethods.TryGetValue(call.Name, out var pluginMethod))
                {
                    return await ExecuteAsync(call, pluginMethod.Plugin, pluginMethod.Method, cancellationToken);
                }
                return new ToolExecutionResult(
                    call.Id,
                    call.Name,
                    call.Arguments,
                    $"Error: Unknown tool '{call.Name}'",
                    Success: false);
            });

            return await Task.WhenAll(executionTasks);
        }
        else
        {
            // Sequential execution to avoid DbContext concurrency issues
            var results = new List<ToolExecutionResult>();
            foreach (var call in toolCalls)
            {
                if (pluginMethods.TryGetValue(call.Name, out var pluginMethod))
                {
                    var result = await ExecuteAsync(call, pluginMethod.Plugin, pluginMethod.Method, cancellationToken);
                    results.Add(result);
                }
                else
                {
                    results.Add(new ToolExecutionResult(
                        call.Id,
                        call.Name,
                        call.Arguments,
                        $"Error: Unknown tool '{call.Name}'",
                        Success: false));
                }
            }
            return results.ToArray();
        }
    }

    /// <inheritdoc />
    public string GenerateToolId(string toolName, string arguments)
    {
        // Create a deterministic hash from tool name and arguments
        var input = $"{toolName}:{arguments}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        // Take first 12 bytes and convert to base64-like string (alphanumeric)
        var idPart = Convert.ToBase64String(hashBytes, 0, 12)
            .Replace("+", "0")
            .Replace("/", "1")
            .Replace("=", "");
        return idPart;
    }

    private async Task<string> InvokePluginMethodAsync(IAgentPlugin plugin, MethodInfo method, JsonNode? input)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];

        _logger.LogDebug("Invoking plugin method {MethodName} with input: {Input}",
            method.Name, input?.ToJsonString() ?? "null");

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramName = param.Name!;

            if (input is JsonObject jsonObj)
            {
                // First try the exact parameter name
                if (jsonObj.TryGetPropertyValue(paramName, out var value))
                {
                    args[i] = ConvertJsonToType(value, param.ParameterType);
                    _logger.LogDebug("Parameter {ParamName} found with value: {Value}",
                        paramName, value?.ToJsonString() ?? "null");
                }
                // Try fallback aliases if exact name not found
                else if (TryGetValueWithAliases(jsonObj, paramName, out var aliasValue, out var usedAlias))
                {
                    args[i] = ConvertJsonToType(aliasValue, param.ParameterType);
                    _logger.LogWarning("Parameter {ParamName} not found, but found alias {Alias} with value. Using alias value.",
                        paramName, usedAlias);
                }
                else if (param.HasDefaultValue)
                {
                    args[i] = param.DefaultValue;
                    _logger.LogDebug("Parameter {ParamName} not found, using default value", paramName);
                }
                else
                {
                    args[i] = null;
                    _logger.LogWarning("Required parameter {ParamName} not found in tool arguments and has no default. Available keys: {Keys}",
                        paramName, string.Join(", ", jsonObj.Select(kvp => kvp.Key)));
                }
            }
            else if (param.HasDefaultValue)
            {
                args[i] = param.DefaultValue;
            }
            else
            {
                args[i] = null;
                _logger.LogWarning("Input is not a JsonObject for method {MethodName}, parameter {ParamName} will be null",
                    method.Name, paramName);
            }
        }

        var result = method.Invoke(plugin.GetPluginInstance(), args);

        if (result is Task task)
        {
            await task;
            var resultProperty = task.GetType().GetProperty("Result");
            result = resultProperty?.GetValue(task);
        }

        return result?.ToString() ?? "";
    }

    private static bool TryGetValueWithAliases(JsonObject jsonObj, string paramName, out JsonNode? value, out string? usedAlias)
    {
        value = null;
        usedAlias = null;

        // Check if we have aliases for this parameter
        if (ParameterAliases.TryGetValue(paramName, out var aliases))
        {
            foreach (var alias in aliases)
            {
                if (jsonObj.TryGetPropertyValue(alias, out value) && value != null)
                {
                    usedAlias = alias;
                    return true;
                }
            }
        }

        // Also try case-insensitive matching as a last resort
        foreach (var kvp in jsonObj)
        {
            if (kvp.Key.Equals(paramName, StringComparison.OrdinalIgnoreCase) && kvp.Key != paramName)
            {
                value = kvp.Value;
                usedAlias = kvp.Key;
                return true;
            }
        }

        return false;
    }

    private static object? ConvertJsonToType(JsonNode? node, Type targetType)
    {
        if (node == null) return null;

        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        try
        {
            if (underlyingType == typeof(string)) return node.GetValue<string>();
            if (underlyingType == typeof(int)) return node.GetValue<int>();
            if (underlyingType == typeof(long)) return node.GetValue<long>();
            if (underlyingType == typeof(float)) return node.GetValue<float>();
            if (underlyingType == typeof(double)) return node.GetValue<double>();
            if (underlyingType == typeof(bool)) return node.GetValue<bool>();

            return node.ToString();
        }
        catch
        {
            return node.ToString();
        }
    }
}
