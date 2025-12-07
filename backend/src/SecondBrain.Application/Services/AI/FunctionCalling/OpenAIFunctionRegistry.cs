using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Registry for managing OpenAI function handlers.
/// Provides registration, resolution, and execution of native function calling.
/// </summary>
public interface IOpenAIFunctionRegistry
{
    /// <summary>
    /// Get all tool definitions for the OpenAI API
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
    Task<OpenAIFunctionExecutionResult> ExecuteAsync(
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
/// Default implementation of the OpenAI function registry
/// </summary>
public class OpenAIFunctionRegistry : IOpenAIFunctionRegistry
{
    private readonly Dictionary<string, IOpenAIFunctionHandler> _handlers;
    private readonly ILogger<OpenAIFunctionRegistry> _logger;

    public OpenAIFunctionRegistry(
        IEnumerable<IOpenAIFunctionHandler> handlers,
        ILogger<OpenAIFunctionRegistry> logger)
    {
        _logger = logger;
        _handlers = new Dictionary<string, IOpenAIFunctionHandler>(StringComparer.OrdinalIgnoreCase);

        foreach (var handler in handlers)
        {
            if (_handlers.ContainsKey(handler.FunctionName))
            {
                _logger.LogWarning(
                    "Duplicate OpenAI function handler registration for '{FunctionName}'. Overwriting.",
                    handler.FunctionName);
            }
            _handlers[handler.FunctionName] = handler;
            _logger.LogDebug("Registered OpenAI function handler: {FunctionName}", handler.FunctionName);
        }

        _logger.LogInformation("Initialized OpenAI function registry with {Count} handlers", _handlers.Count);
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
                _logger.LogWarning("Requested OpenAI function '{FunctionName}' not found in registry", name);
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
    public async Task<OpenAIFunctionExecutionResult> ExecuteAsync(
        string functionName,
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!_handlers.TryGetValue(functionName, out var handler))
        {
            _logger.LogError("OpenAI function '{FunctionName}' not found in registry", functionName);
            return OpenAIFunctionExecutionResult.Fail($"Function '{functionName}' not found");
        }

        try
        {
            _logger.LogDebug(
                "Executing OpenAI function '{FunctionName}' for user '{UserId}'",
                functionName, userId);

            var result = await handler.ExecuteAsync(arguments, userId, cancellationToken);

            _logger.LogDebug(
                "OpenAI function '{FunctionName}' executed. Success: {Success}",
                functionName, result.Success);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing OpenAI function '{FunctionName}'", functionName);
            return OpenAIFunctionExecutionResult.Fail($"Error executing function: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetRegisteredFunctionNames()
    {
        return _handlers.Keys.ToList();
    }
}
