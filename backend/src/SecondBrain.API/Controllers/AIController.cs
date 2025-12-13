using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using SecondBrain.Application.Commands.AI.DeleteOllamaModel;
using SecondBrain.Application.Commands.AI.GenerateChatCompletion;
using SecondBrain.Application.Commands.AI.GenerateCompletion;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.AI.GetAllProvidersHealth;
using SecondBrain.Application.Queries.AI.GetEnabledProviders;
using SecondBrain.Application.Queries.AI.GetProviderHealth;
using SecondBrain.Application.Queries.AI.GetProviders;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using System.Text.Json;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class AIController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly OllamaProvider _ollamaProvider;
    private readonly ILogger<AIController> _logger;

    public AIController(
        IMediator mediator,
        OllamaProvider ollamaProvider,
        ILogger<AIController> logger)
    {
        _mediator = mediator;
        _ollamaProvider = ollamaProvider;
        _logger = logger;
    }

    /// <summary>
    /// Get health status for all AI providers
    /// </summary>
    /// <param name="ollamaBaseUrl">Optional remote Ollama URL (e.g., http://192.168.1.100:11434)</param>
    /// <param name="useRemoteOllama">Whether to use the remote Ollama URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpGet("health")]
    [OutputCache(PolicyName = "AIHealth")]
    [ProducesResponseType(typeof(AIHealthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AIHealthResponse>> GetAllProvidersHealth(
        [FromQuery] string? ollamaBaseUrl = null,
        [FromQuery] bool useRemoteOllama = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetAllProvidersHealthQuery(ollamaBaseUrl, useRemoteOllama), cancellationToken);

        return result.Match(
            onSuccess: response => Ok(response),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Get health status for a specific AI provider
    /// </summary>
    /// <param name="provider">Provider name</param>
    /// <param name="ollamaBaseUrl">Optional remote Ollama URL (e.g., http://192.168.1.100:11434)</param>
    /// <param name="useRemoteOllama">Whether to use the remote Ollama URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpGet("health/{provider}")]
    [OutputCache(PolicyName = "AIHealth")]
    [ProducesResponseType(typeof(AIProviderHealth), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AIProviderHealth>> GetProviderHealth(
        string provider,
        [FromQuery] string? ollamaBaseUrl = null,
        [FromQuery] bool useRemoteOllama = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetProviderHealthQuery(provider, ollamaBaseUrl, useRemoteOllama), cancellationToken);

        return result.Match(
            onSuccess: health => Ok(health),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Generate a completion using a specific AI provider
    /// </summary>
    [HttpPost("generate/{provider}")]
    [ProducesResponseType(typeof(AIResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AIResponse>> GenerateCompletion(
        string provider,
        [FromBody] AIRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GenerateCompletionCommand(provider, request), cancellationToken);

        return result.Match(
            onSuccess: response => Ok(response),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Generate a chat completion using a specific AI provider
    /// </summary>
    [HttpPost("chat/{provider}")]
    [ProducesResponseType(typeof(AIResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AIResponse>> GenerateChatCompletion(
        string provider,
        [FromBody] ChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GenerateChatCompletionCommand(provider, request), cancellationToken);

        return result.Match(
            onSuccess: response => Ok(response),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// List all available AI providers
    /// </summary>
    [HttpGet("providers")]
    [OutputCache(PolicyName = "AIHealth")]
    [ProducesResponseType(typeof(IEnumerable<ProviderInfo>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProviderInfo>>> GetProviders(
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetProvidersQuery(), cancellationToken);

        return result.Match(
            onSuccess: providers => Ok(providers),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// List enabled AI providers only
    /// </summary>
    [HttpGet("providers/enabled")]
    [ProducesResponseType(typeof(IEnumerable<ProviderInfo>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProviderInfo>>> GetEnabledProviders(
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetEnabledProvidersQuery(), cancellationToken);

        return result.Match(
            onSuccess: providers => Ok(providers),
            onFailure: error => HandleError(error)
        );
    }

    /// <summary>
    /// Pull (download) an Ollama model with real-time progress updates via Server-Sent Events.
    /// </summary>
    /// <param name="request">Pull request containing model name and optional remote URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpPost("ollama/pull")]
    [Produces("text/event-stream")]
    public async Task PullOllamaModel(
        [FromBody] OllamaPullRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ModelName))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsync("Model name is required");
            return;
        }

        // Set up SSE response headers
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no"); // Disable nginx buffering

        _logger.LogInformation("Starting SSE stream for model pull: {ModelName}", request.ModelName);

        try
        {
            await foreach (var progress in _ollamaProvider.PullModelAsync(
                request.ModelName,
                request.OllamaBaseUrl,
                cancellationToken))
            {
                var json = JsonSerializer.Serialize(progress, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);

                // If completed or errored, end the stream
                if (progress.IsComplete || progress.IsError)
                {
                    break;
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Model pull cancelled by client: {ModelName}", request.ModelName);
            var cancelProgress = new OllamaPullProgress
            {
                Status = "Cancelled",
                IsError = true,
                ErrorMessage = "Download cancelled by user"
            };
            var json = JsonSerializer.Serialize(cancelProgress, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            await Response.WriteAsync($"data: {json}\n\n");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during model pull: {ModelName}", request.ModelName);
            var errorProgress = new OllamaPullProgress
            {
                Status = "Error",
                IsError = true,
                ErrorMessage = ex.Message
            };
            var json = JsonSerializer.Serialize(errorProgress, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            await Response.WriteAsync($"data: {json}\n\n");
        }
    }

    /// <summary>
    /// Delete an Ollama model from the local or remote instance.
    /// </summary>
    /// <param name="modelName">Name of the model to delete</param>
    /// <param name="ollamaBaseUrl">Optional remote Ollama URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpDelete("ollama/models/{modelName}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> DeleteOllamaModel(
        string modelName,
        [FromQuery] string? ollamaBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new DeleteOllamaModelCommand(modelName, ollamaBaseUrl), cancellationToken);

        return result.Match(
            onSuccess: message => Ok(new { message }),
            onFailure: error => HandleError(error)
        );
    }

    private ActionResult HandleError(SecondBrain.Core.Common.Error error)
    {
        return error.Code switch
        {
            "ValidationFailed" => BadRequest(new { error = error.Code, message = error.Message }),
            "NotFound" => NotFound(new { error = error.Code, message = error.Message }),
            "HealthCheckFailed" => StatusCode(500, new { error = error.Code, message = error.Message }),
            "GenerationFailed" => StatusCode(500, new { error = error.Code, message = error.Message }),
            "ListProvidersFailed" => StatusCode(500, new { error = error.Code, message = error.Message }),
            "ListEnabledProvidersFailed" => StatusCode(500, new { error = error.Code, message = error.Message }),
            "DeleteFailed" => StatusCode(500, new { error = error.Code, message = error.Message }),
            _ => StatusCode(500, new { error = error.Code, message = error.Message })
        };
    }
}
