using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using OllamaSharp.Models.Chat;
using SecondBrain.Application.Services.Agents.Plugins;

namespace SecondBrain.Application.Services.AI.FunctionCalling.Handlers;

/// <summary>
/// A plugin-based Ollama function handler that uses reflection to expose
/// all [KernelFunction] methods from a plugin as individual Ollama functions.
/// This mirrors how Claude and Gemini's native tool calling works in AgentService.
/// </summary>
public class PluginBasedOllamaFunctionHandler : IOllamaFunctionHandler
{
    private readonly IAgentPlugin _plugin;
    private readonly MethodInfo _method;
    private readonly Tool _toolDefinition;
    private readonly ILogger _logger;
    private readonly string _functionName;

    public string FunctionName => _functionName;

    public PluginBasedOllamaFunctionHandler(
        IAgentPlugin plugin,
        MethodInfo method,
        ILogger logger)
    {
        _plugin = plugin;
        _method = method;
        _logger = logger;

        var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>()
            ?? throw new ArgumentException("Method must have [KernelFunction] attribute");

        _functionName = funcAttr.Name ?? method.Name;
        _toolDefinition = OllamaFunctionDeclarationBuilder.BuildFromMethod(method, funcAttr)
            ?? throw new ArgumentException("Failed to build Tool definition");
    }

    public Tool GetToolDefinition() => _toolDefinition;

    public async Task<OllamaFunctionExecutionResult> ExecuteAsync(
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Set user context
            _plugin.SetCurrentUserId(userId);
            _plugin.SetAgentRagEnabled(true);

            _logger.LogDebug("Executing Ollama function '{FunctionName}' for user '{UserId}'",
                _functionName, userId);

            // Convert JsonElement to JsonNode for compatibility with existing method
            var jsonNode = JsonNode.Parse(arguments.GetRawText());

            // Invoke the method
            var result = await InvokeMethodAsync(jsonNode);

            _logger.LogDebug("Ollama function '{FunctionName}' completed successfully", _functionName);

            return OllamaFunctionExecutionResult.Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Ollama function '{FunctionName}'", _functionName);
            return OllamaFunctionExecutionResult.Fail($"Error: {ex.Message}");
        }
    }

    private async Task<object?> InvokeMethodAsync(JsonNode? input)
    {
        var parameters = _method.GetParameters();
        var args = new object?[parameters.Length];

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramName = param.Name!;

            if (input is JsonObject jsonObj)
            {
                if (jsonObj.TryGetPropertyValue(paramName, out var value))
                {
                    args[i] = ConvertJsonToType(value, param.ParameterType);
                }
                else if (TryGetValueWithAliases(jsonObj, paramName, out var aliasValue))
                {
                    args[i] = ConvertJsonToType(aliasValue, param.ParameterType);
                }
                else if (param.HasDefaultValue)
                {
                    args[i] = param.DefaultValue;
                }
                else
                {
                    args[i] = GetDefaultForType(param.ParameterType);
                }
            }
            else if (param.HasDefaultValue)
            {
                args[i] = param.DefaultValue;
            }
            else
            {
                args[i] = GetDefaultForType(param.ParameterType);
            }
        }

        var result = _method.Invoke(_plugin.GetPluginInstance(), args);

        if (result is Task task)
        {
            await task;
            var resultProperty = task.GetType().GetProperty("Result");
            return resultProperty?.GetValue(task);
        }

        return result;
    }

    // Parameter aliases for common variations (matches other providers)
    private static readonly Dictionary<string, string[]> ParameterAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        { "content", new[] { "body", "text", "note_content", "noteContent", "message" } },
        { "title", new[] { "name", "heading", "subject" } },
        { "query", new[] { "search", "searchQuery", "search_query", "q" } },
        { "tags", new[] { "labels", "categories", "tag" } },
        { "noteId", new[] { "note_id", "id", "noteID" } },
        { "contentToAppend", new[] { "content_to_append", "appendContent", "append_content", "newContent" } },
        { "newTitle", new[] { "new_title", "duplicateTitle" } },
        { "maxResults", new[] { "max_results", "limit", "count" } }
    };

    private static bool TryGetValueWithAliases(JsonObject jsonObj, string paramName, out JsonNode? value)
    {
        value = null;

        if (ParameterAliases.TryGetValue(paramName, out var aliases))
        {
            foreach (var alias in aliases)
            {
                if (jsonObj.TryGetPropertyValue(alias, out value) && value != null)
                {
                    return true;
                }
            }
        }

        // Case-insensitive fallback
        foreach (var kvp in jsonObj)
        {
            if (kvp.Key.Equals(paramName, StringComparison.OrdinalIgnoreCase) && kvp.Key != paramName)
            {
                value = kvp.Value;
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
            if (underlyingType == typeof(string))
                return node.GetValue<string>();
            if (underlyingType == typeof(int))
                return node.GetValue<int>();
            if (underlyingType == typeof(long))
                return node.GetValue<long>();
            if (underlyingType == typeof(float))
                return node.GetValue<float>();
            if (underlyingType == typeof(double))
                return node.GetValue<double>();
            if (underlyingType == typeof(bool))
                return node.GetValue<bool>();

            return node.ToString();
        }
        catch
        {
            return node.ToString();
        }
    }

    private static object? GetDefaultForType(Type type)
    {
        if (type == typeof(string))
            return null;
        if (type.IsValueType)
            return Activator.CreateInstance(type);
        return null;
    }

    /// <summary>
    /// Creates handlers for all [KernelFunction] methods in a plugin.
    /// </summary>
    public static IEnumerable<PluginBasedOllamaFunctionHandler> CreateFromPlugin(
        IAgentPlugin plugin,
        ILogger logger)
    {
        var pluginInstance = plugin.GetPluginInstance();

        foreach (var method in pluginInstance.GetType().GetMethods())
        {
            var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
            if (funcAttr != null)
            {
                yield return new PluginBasedOllamaFunctionHandler(plugin, method, logger);
            }
        }
    }
}
