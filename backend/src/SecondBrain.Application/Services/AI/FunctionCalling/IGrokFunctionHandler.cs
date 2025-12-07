using OpenAI.Chat;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.FunctionCalling;

/// <summary>
/// Interface for Grok/X.AI native function handlers.
/// Grok uses an OpenAI-compatible API, so this interface mirrors IOpenAIFunctionHandler.
/// Implement this interface to create tools that Grok can call directly.
/// </summary>
public interface IGrokFunctionHandler
{
    /// <summary>
    /// The name of the function as it will be exposed to the model
    /// </summary>
    string FunctionName { get; }

    /// <summary>
    /// Get the tool definition for the Grok API (OpenAI-compatible format)
    /// </summary>
    ChatTool GetToolDefinition();

    /// <summary>
    /// Execute the function with the given arguments
    /// </summary>
    /// <param name="arguments">The arguments passed by the model as JSON</param>
    /// <param name="userId">The ID of the user making the request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The result of the function execution</returns>
    Task<GrokFunctionExecutionResult> ExecuteAsync(
        JsonElement arguments,
        string userId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of a Grok function execution
/// </summary>
public class GrokFunctionExecutionResult
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
    public static GrokFunctionExecutionResult Ok(object? data = null) => new()
    {
        Success = true,
        Data = data
    };

    /// <summary>
    /// Create a failed result
    /// </summary>
    public static GrokFunctionExecutionResult Fail(string error) => new()
    {
        Success = false,
        Error = error
    };
}
