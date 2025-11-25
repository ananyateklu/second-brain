using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Net.Http;
using System.Net.Sockets;

namespace SecondBrain.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AIController : ControllerBase
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<AIController> _logger;

    public AIController(
        IAIProviderFactory providerFactory,
        ILogger<AIController> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    /// <summary>
    /// Get health status for all AI providers
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(AIHealthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AIHealthResponse>> GetAllProvidersHealth(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = _providerFactory.GetAllProviders();
            var healthChecks = new List<AIProviderHealth>();

            foreach (var provider in providers)
            {
                try
                {
                    var health = await provider.GetHealthStatusAsync(cancellationToken);
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
    [HttpGet("health/{provider}")]
    [ProducesResponseType(typeof(AIProviderHealth), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AIProviderHealth>> GetProviderHealth(
        string provider,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var aiProvider = _providerFactory.GetProvider(provider);
            var health = await aiProvider.GetHealthStatusAsync(cancellationToken);
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
}

// DTOs for API responses
public class AIHealthResponse
{
    public DateTime CheckedAt { get; set; }
    public IEnumerable<AIProviderHealth> Providers { get; set; } = new List<AIProviderHealth>();
}

public class ChatCompletionRequest
{
    public IEnumerable<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    public AIRequest? Settings { get; set; }
}

public class ProviderInfo
{
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
