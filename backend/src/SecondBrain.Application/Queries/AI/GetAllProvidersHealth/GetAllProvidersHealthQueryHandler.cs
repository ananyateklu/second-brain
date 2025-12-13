using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;
using System.Net.Http;
using System.Net.Sockets;

namespace SecondBrain.Application.Queries.AI.GetAllProvidersHealth;

public class GetAllProvidersHealthQueryHandler : IRequestHandler<GetAllProvidersHealthQuery, Result<AIHealthResponse>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GetAllProvidersHealthQueryHandler> _logger;

    public GetAllProvidersHealthQueryHandler(
        IAIProviderFactory providerFactory,
        ILogger<GetAllProvidersHealthQueryHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public async Task<Result<AIHealthResponse>> Handle(GetAllProvidersHealthQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var providers = _providerFactory.GetAllProviders();
            var healthChecks = new List<AIProviderHealth>();

            // Build config overrides for Ollama if remote URL is provided
            Dictionary<string, string>? ollamaConfigOverrides = null;
            if (request.UseRemoteOllama && !string.IsNullOrWhiteSpace(request.OllamaBaseUrl))
            {
                ollamaConfigOverrides = new Dictionary<string, string>
                {
                    { "ollamaBaseUrl", request.OllamaBaseUrl }
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

            return Result<AIHealthResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking AI providers health");
            return Result<AIHealthResponse>.Failure(Error.Custom("HealthCheckFailed", "Failed to check AI providers health"));
        }
    }
}
