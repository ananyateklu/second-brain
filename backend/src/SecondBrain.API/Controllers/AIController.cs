using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.Json;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class AIController : ControllerBase
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly OllamaProvider _ollamaProvider;
    private readonly ILogger<AIController> _logger;

    public AIController(
        IAIProviderFactory providerFactory,
        OllamaProvider ollamaProvider,
        ILogger<AIController> logger)
    {
        _providerFactory = providerFactory;
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
    [ProducesResponseType(typeof(AIHealthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AIHealthResponse>> GetAllProvidersHealth(
        [FromQuery] string? ollamaBaseUrl = null,
        [FromQuery] bool useRemoteOllama = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = _providerFactory.GetAllProviders();
            var healthChecks = new List<AIProviderHealth>();

            // Build config overrides for Ollama if remote URL is provided
            Dictionary<string, string>? ollamaConfigOverrides = null;
            if (useRemoteOllama && !string.IsNullOrWhiteSpace(ollamaBaseUrl))
            {
                ollamaConfigOverrides = new Dictionary<string, string>
                {
                    { "ollamaBaseUrl", ollamaBaseUrl }
                };
            }

            foreach (var provider in providers)
            {
                try
                {
                    AIProviderHealth health;

                    // For Ollama, use the overload that accepts config overrides
                    if (provider.ProviderName == "Ollama" && ollamaConfigOverrides != null)
                    {
                        health = await provider.GetHealthStatusAsync(ollamaConfigOverrides, cancellationToken);
                    }
                    else
                    {
                        health = await provider.GetHealthStatusAsync(cancellationToken);
                    }

                    healthChecks.Add(health);
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    // Connection failures for optional services (like Ollama) are expected
                    _logger.LogWarning(ex, "Failed to check health for provider {Provider} - service unreachable", provider.ProviderName);
                    healthChecks.Add(new AIProviderHealth
                    {
                        Provider = provider.ProviderName,
                        IsHealthy = false,
                        CheckedAt = DateTime.UtcNow,
                        Status = "Unreachable",
                        ErrorMessage = $"Cannot connect to {provider.ProviderName}. Service may not be running."
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to check health for provider {Provider}", provider.ProviderName);
                    healthChecks.Add(new AIProviderHealth
                    {
                        Provider = provider.ProviderName,
                        IsHealthy = false,
                        CheckedAt = DateTime.UtcNow,
                        Status = "Error",
                        ErrorMessage = ex.Message
                    });
                }
            }

            var response = new AIHealthResponse
            {
                CheckedAt = DateTime.UtcNow,
                Providers = healthChecks
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking AI providers health");
            return StatusCode(500, new { error = "Failed to check AI providers health" });
        }
    }

    /// <summary>
    /// Get health status for a specific AI provider
    /// </summary>
    /// <param name="provider">Provider name</param>
    /// <param name="ollamaBaseUrl">Optional remote Ollama URL (e.g., http://192.168.1.100:11434)</param>
    /// <param name="useRemoteOllama">Whether to use the remote Ollama URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpGet("health/{provider}")]
    [ProducesResponseType(typeof(AIProviderHealth), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AIProviderHealth>> GetProviderHealth(
        string provider,
        [FromQuery] string? ollamaBaseUrl = null,
        [FromQuery] bool useRemoteOllama = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var aiProvider = _providerFactory.GetProvider(provider);

            AIProviderHealth health;

            // For Ollama, use the overload that accepts config overrides
            if (aiProvider.ProviderName == "Ollama" && useRemoteOllama && !string.IsNullOrWhiteSpace(ollamaBaseUrl))
            {
                var configOverrides = new Dictionary<string, string>
                {
                    { "ollamaBaseUrl", ollamaBaseUrl }
                };
                health = await aiProvider.GetHealthStatusAsync(configOverrides, cancellationToken);
            }
            else
            {
                health = await aiProvider.GetHealthStatusAsync(cancellationToken);
            }

            return Ok(health);
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = $"Provider '{provider}' not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking health for provider {Provider}", provider);
            return StatusCode(500, new { error = $"Failed to check health for provider '{provider}'" });
        }
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
        if (string.IsNullOrWhiteSpace(request.Prompt))
        {
            return BadRequest(new { error = "Prompt is required" });
        }

        try
        {
            var aiProvider = _providerFactory.GetProvider(provider);

            if (!aiProvider.IsEnabled)
            {
                return BadRequest(new { error = $"Provider '{provider}' is not enabled" });
            }

            var response = await aiProvider.GenerateCompletionAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = $"Provider '{provider}' not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating completion with provider {Provider}", provider);
            return StatusCode(500, new { error = "Failed to generate completion" });
        }
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
        if (request.Messages == null || !request.Messages.Any())
        {
            return BadRequest(new { error = "Messages are required" });
        }

        try
        {
            var aiProvider = _providerFactory.GetProvider(provider);

            if (!aiProvider.IsEnabled)
            {
                return BadRequest(new { error = $"Provider '{provider}' is not enabled" });
            }

            var response = await aiProvider.GenerateChatCompletionAsync(
                request.Messages,
                request.Settings,
                cancellationToken);

            return Ok(response);
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = $"Provider '{provider}' not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating chat completion with provider {Provider}", provider);
            return StatusCode(500, new { error = "Failed to generate chat completion" });
        }
    }

    /// <summary>
    /// List all available AI providers
    /// </summary>
    [HttpGet("providers")]
    [ProducesResponseType(typeof(IEnumerable<ProviderInfo>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<ProviderInfo>> GetProviders()
    {
        try
        {
            var providers = _providerFactory.GetAllProviders();
            var providerInfos = providers.Select(p => new ProviderInfo
            {
                Name = p.ProviderName,
                IsEnabled = p.IsEnabled
            });

            return Ok(providerInfos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing AI providers");
            return StatusCode(500, new { error = "Failed to list AI providers" });
        }
    }

    /// <summary>
    /// List enabled AI providers only
    /// </summary>
    [HttpGet("providers/enabled")]
    [ProducesResponseType(typeof(IEnumerable<ProviderInfo>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<ProviderInfo>> GetEnabledProviders()
    {
        try
        {
            var providers = _providerFactory.GetEnabledProviders();
            var providerInfos = providers.Select(p => new ProviderInfo
            {
                Name = p.ProviderName,
                IsEnabled = p.IsEnabled
            });

            return Ok(providerInfos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing enabled AI providers");
            return StatusCode(500, new { error = "Failed to list enabled AI providers" });
        }
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
        if (string.IsNullOrWhiteSpace(modelName))
        {
            return BadRequest(new { error = "Model name is required" });
        }

        try
        {
            var (success, errorMessage) = await _ollamaProvider.DeleteModelAsync(
                modelName,
                ollamaBaseUrl,
                cancellationToken);

            if (success)
            {
                return Ok(new { message = $"Model '{modelName}' deleted successfully" });
            }
            else
            {
                return BadRequest(new { error = errorMessage ?? "Failed to delete model" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Ollama model: {ModelName}", modelName);
            return StatusCode(500, new { error = "Failed to delete model" });
        }
    }
}
