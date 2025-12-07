using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Registry for managing Grok/X.AI function handlers.
/// Provides registration, resolution, and execution of native function calling.
/// </summary>
public interface IGrokFunctionRegistry
{
    /// <summary>
    /// Get all tool definitions for the Grok API (OpenAI-compatible format)
    /// </summary>
    IReadOnlyList<ChatTool> GetAllTools();

    /// <summary>
    /// Get tool definitions for specific function names
    /// </summary>
    IReadOnlyList<ChatTool> GetTools(IEnumerable<string> functionNames);

    /// <summary>
    /// Check if a function is registered
    /// </summary>
    bool HasFunction(string functionName);

    /// <summary>
    /// Execute a function by name
    /// </summary>
    Task<GrokFunctionExecutionResult> ExecuteAsync(
        string functionName,
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all registered function names
    /// </summary>
    IReadOnlyList<string> GetRegisteredFunctionNames();
}

/// <summary>
/// Default implementation of the Grok function registry
/// </summary>
public class GrokFunctionRegistry : IGrokFunctionRegistry
{
    private readonly Dictionary<string, IGrokFunctionHandler> _handlers;
    private readonly ILogger<GrokFunctionRegistry> _logger;

    public GrokFunctionRegistry(
        IEnumerable<IGrokFunctionHandler> handlers,
        ILogger<GrokFunctionRegistry> logger)
    {
        _logger = logger;
        _handlers = new Dictionary<string, IGrokFunctionHandler>(StringComparer.OrdinalIgnoreCase);

        foreach (var handler in handlers)
        {
            if (_handlers.ContainsKey(handler.FunctionName))
            {
                _logger.LogWarning(
                    "Duplicate Grok function handler registration for '{FunctionName}'. Overwriting.",
                    handler.FunctionName);
            }
            _handlers[handler.FunctionName] = handler;
            _logger.LogDebug("Registered Grok function handler: {FunctionName}", handler.FunctionName);
        }

        _logger.LogInformation("Initialized Grok function registry with {Count} handlers", _handlers.Count);
    }

    /// <inheritdoc />
    public IReadOnlyList<ChatTool> GetAllTools()
    {
        return _handlers.Values
            .Select(h => h.GetToolDefinition())
            .ToList();
    }

    /// <inheritdoc />
    public IReadOnlyList<ChatTool> GetTools(IEnumerable<string> functionNames)
    {
        var tools = new List<ChatTool>();
        foreach (var name in functionNames)
        {
            if (_handlers.TryGetValue(name, out var handler))
            {
                tools.Add(handler.GetToolDefinition());
            }
            else
            {
                _logger.LogWarning("Requested Grok function '{FunctionName}' not found in registry", name);
            }
        }
        return tools;
    }

    /// <inheritdoc />
    public bool HasFunction(string functionName)
    {
        return _handlers.ContainsKey(functionName);
    }

    /// <inheritdoc />
    public async Task<GrokFunctionExecutionResult> ExecuteAsync(
        string functionName,
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!_handlers.TryGetValue(functionName, out var handler))
        {
            _logger.LogError("Grok function '{FunctionName}' not found in registry", functionName);
            return GrokFunctionExecutionResult.Fail($"Function '{functionName}' not found");
        }

        try
        {
            _logger.LogDebug(
                "Executing Grok function '{FunctionName}' for user '{UserId}'",
                functionName, userId);

            var result = await handler.ExecuteAsync(arguments, userId, cancellationToken);

            _logger.LogDebug(
                "Grok function '{FunctionName}' executed. Success: {Success}",
                functionName, result.Success);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Grok function '{FunctionName}'", functionName);
            return GrokFunctionExecutionResult.Fail($"Error executing function: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetRegisteredFunctionNames()
    {
        return _handlers.Keys.ToList();
    }
}
