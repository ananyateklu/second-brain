using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Registry for managing Gemini function handlers.
/// Provides registration, resolution, and execution of native function calling.
/// </summary>
public interface IGeminiFunctionRegistry
{
    /// <summary>
    /// Get all function declarations for the Gemini API
    /// </summary>
    IReadOnlyList<FunctionDeclaration> GetAllDeclarations();

    /// <summary>
    /// Get function declarations for specific function names
    /// </summary>
    IReadOnlyList<FunctionDeclaration> GetDeclarations(IEnumerable<string> functionNames);

    /// <summary>
    /// Check if a function is registered
    /// </summary>
    bool HasFunction(string functionName);

    /// <summary>
    /// Execute a function by name
    /// </summary>
    Task<FunctionExecutionResult> ExecuteAsync(
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
/// Default implementation of the Gemini function registry
/// </summary>
public class GeminiFunctionRegistry : IGeminiFunctionRegistry
{
    private readonly Dictionary<string, IGeminiFunctionHandler> _handlers;
    private readonly ILogger<GeminiFunctionRegistry> _logger;

    public GeminiFunctionRegistry(
        IEnumerable<IGeminiFunctionHandler> handlers,
        ILogger<GeminiFunctionRegistry> logger)
    {
        _logger = logger;
        _handlers = new Dictionary<string, IGeminiFunctionHandler>(StringComparer.OrdinalIgnoreCase);

        foreach (var handler in handlers)
        {
            if (_handlers.ContainsKey(handler.FunctionName))
            {
                _logger.LogWarning(
                    "Duplicate function handler registration for '{FunctionName}'. Overwriting.",
                    handler.FunctionName);
            }
            _handlers[handler.FunctionName] = handler;
            _logger.LogDebug("Registered function handler: {FunctionName}", handler.FunctionName);
        }

        _logger.LogInformation("Initialized Gemini function registry with {Count} handlers", _handlers.Count);
    }

    /// <inheritdoc />
    public IReadOnlyList<FunctionDeclaration> GetAllDeclarations()
    {
        return _handlers.Values
            .Select(h => h.GetDeclaration())
            .ToList();
    }

    /// <inheritdoc />
    public IReadOnlyList<FunctionDeclaration> GetDeclarations(IEnumerable<string> functionNames)
    {
        var declarations = new List<FunctionDeclaration>();
        foreach (var name in functionNames)
        {
            if (_handlers.TryGetValue(name, out var handler))
            {
                declarations.Add(handler.GetDeclaration());
            }
            else
            {
                _logger.LogWarning("Requested function '{FunctionName}' not found in registry", name);
            }
        }
        return declarations;
    }

    /// <inheritdoc />
    public bool HasFunction(string functionName)
    {
        return _handlers.ContainsKey(functionName);
    }

    /// <inheritdoc />
    public async Task<FunctionExecutionResult> ExecuteAsync(
        string functionName,
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!_handlers.TryGetValue(functionName, out var handler))
        {
            _logger.LogError("Function '{FunctionName}' not found in registry", functionName);
            return FunctionExecutionResult.Fail($"Function '{functionName}' not found");
        }

        try
        {
            _logger.LogDebug(
                "Executing function '{FunctionName}' for user '{UserId}'",
                functionName, userId);

            var result = await handler.ExecuteAsync(arguments, userId, cancellationToken);

            _logger.LogDebug(
                "Function '{FunctionName}' executed. Success: {Success}",
                functionName, result.Success);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing function '{FunctionName}'", functionName);
            return FunctionExecutionResult.Fail($"Error executing function: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetRegisteredFunctionNames()
    {
        return _handlers.Keys.ToList();
    }
}
