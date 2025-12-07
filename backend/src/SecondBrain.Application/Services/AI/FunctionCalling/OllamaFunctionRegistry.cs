using Microsoft.Extensions.Logging;
using OllamaSharp.Models.Chat;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Registry for managing Ollama function handlers.
/// Provides registration, resolution, and execution of native function calling.
/// </summary>
public interface IOllamaFunctionRegistry
{
    /// <summary>
    /// Get all tool definitions for the Ollama API
    /// </summary>
    IReadOnlyList<Tool> GetAllTools();

    /// <summary>
    /// Get tool definitions for specific function names
    /// </summary>
    IReadOnlyList<Tool> GetTools(IEnumerable<string> functionNames);

    /// <summary>
    /// Check if a function is registered
    /// </summary>
    bool HasFunction(string functionName);

    /// <summary>
    /// Execute a function by name
    /// </summary>
    Task<OllamaFunctionExecutionResult> ExecuteAsync(
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
/// Default implementation of the Ollama function registry
/// </summary>
public class OllamaFunctionRegistry : IOllamaFunctionRegistry
{
    private readonly Dictionary<string, IOllamaFunctionHandler> _handlers;
    private readonly ILogger<OllamaFunctionRegistry> _logger;

    public OllamaFunctionRegistry(
        IEnumerable<IOllamaFunctionHandler> handlers,
        ILogger<OllamaFunctionRegistry> logger)
    {
        _logger = logger;
        _handlers = new Dictionary<string, IOllamaFunctionHandler>(StringComparer.OrdinalIgnoreCase);

        foreach (var handler in handlers)
        {
            if (_handlers.ContainsKey(handler.FunctionName))
            {
                _logger.LogWarning(
                    "Duplicate Ollama function handler registration for '{FunctionName}'. Overwriting.",
                    handler.FunctionName);
            }
            _handlers[handler.FunctionName] = handler;
            _logger.LogDebug("Registered Ollama function handler: {FunctionName}", handler.FunctionName);
        }

        _logger.LogInformation("Initialized Ollama function registry with {Count} handlers", _handlers.Count);
    }

    /// <inheritdoc />
    public IReadOnlyList<Tool> GetAllTools()
    {
        return _handlers.Values
            .Select(h => h.GetToolDefinition())
            .ToList();
    }

    /// <inheritdoc />
    public IReadOnlyList<Tool> GetTools(IEnumerable<string> functionNames)
    {
        var tools = new List<Tool>();
        foreach (var name in functionNames)
        {
            if (_handlers.TryGetValue(name, out var handler))
            {
                tools.Add(handler.GetToolDefinition());
            }
            else
            {
                _logger.LogWarning("Requested Ollama function '{FunctionName}' not found in registry", name);
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
    public async Task<OllamaFunctionExecutionResult> ExecuteAsync(
        string functionName,
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!_handlers.TryGetValue(functionName, out var handler))
        {
            _logger.LogError("Ollama function '{FunctionName}' not found in registry", functionName);
            return OllamaFunctionExecutionResult.Fail($"Function '{functionName}' not found");
        }

        try
        {
            _logger.LogDebug(
                "Executing Ollama function '{FunctionName}' for user '{UserId}'",
                functionName, userId);

            var result = await handler.ExecuteAsync(arguments, userId, cancellationToken);

            _logger.LogDebug(
                "Ollama function '{FunctionName}' executed. Success: {Success}",
                functionName, result.Success);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing Ollama function '{FunctionName}'", functionName);
            return OllamaFunctionExecutionResult.Fail($"Error executing function: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetRegisteredFunctionNames()
    {
        return _handlers.Keys.ToList();
    }
}
