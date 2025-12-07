using OllamaSharp.Models.Chat;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Interface for Ollama native function handlers.
/// Implement this interface to create tools that Ollama can call directly.
/// </summary>
public interface IOllamaFunctionHandler
{
    /// <summary>
    /// The name of the function as it will be exposed to the model
    /// </summary>
    string FunctionName { get; }

    /// <summary>
    /// Get the tool definition for the Ollama API
    /// </summary>
    Tool GetToolDefinition();

    /// <summary>
    /// Execute the function with the given arguments
    /// </summary>
    /// <param name="arguments">The arguments passed by the model as JSON</param>
    /// <param name="userId">The ID of the user making the request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The result of the function execution</returns>
    Task<OllamaFunctionExecutionResult> ExecuteAsync(
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of an Ollama function execution
/// </summary>
public class OllamaFunctionExecutionResult
{
    /// <summary>
    /// Whether the execution was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The result data to return to the model
    /// </summary>
    public object? Data { get; set; }

    /// <summary>
    /// Error message if execution failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Create a successful result
    /// </summary>
    public static OllamaFunctionExecutionResult Ok(object? data = null) => new()
    {
        Success = true,
        Data = data
    };

    /// <summary>
    /// Create a failed result
    /// </summary>
    public static OllamaFunctionExecutionResult Fail(string error) => new()
    {
        Success = false,
        Error = error
    };
}
