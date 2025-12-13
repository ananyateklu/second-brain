using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetProviderHealth;

public class GetProviderHealthQueryHandler : IRequestHandler<GetProviderHealthQuery, Result<AIProviderHealth>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GetProviderHealthQueryHandler> _logger;

    public GetProviderHealthQueryHandler(
        IAIProviderFactory providerFactory,
        ILogger<GetProviderHealthQueryHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public async Task<Result<AIProviderHealth>> Handle(GetProviderHealthQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var aiProvider = _providerFactory.GetProvider(request.Provider);

            AIProviderHealth health;

            // For Ollama, use the overload that accepts config overrides
            if (aiProvider.ProviderName == "Ollama" && request.UseRemoteOllama && !string.IsNullOrWhiteSpace(request.OllamaBaseUrl))
            {
                var configOverrides = new Dictionary<string, string>
                {
                    { "ollamaBaseUrl", request.OllamaBaseUrl }
                };
                health = await aiProvider.GetHealthStatusAsync(configOverrides, cancellationToken);
            }
            else
            {
                health = await aiProvider.GetHealthStatusAsync(cancellationToken);
            }

            return Result<AIProviderHealth>.Success(health);
        }
        catch (ArgumentException)
        {
            return Result<AIProviderHealth>.Failure(Error.NotFound("Provider", request.Provider));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking health for provider {Provider}", request.Provider);
            return Result<AIProviderHealth>.Failure(Error.Custom("HealthCheckFailed", $"Failed to check health for provider '{request.Provider}'"));
        }
    }
}
