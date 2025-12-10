using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Factory for selecting the appropriate streaming strategy based on the request.
/// </summary>
public class AgentStreamingStrategyFactory : IAgentStreamingStrategyFactory
{
    private readonly IEnumerable<IAgentStreamingStrategy> _strategies;
    private readonly SemanticKernelStreamingStrategy _fallbackStrategy;
    private readonly ILogger<AgentStreamingStrategyFactory> _logger;

    public AgentStreamingStrategyFactory(
        IEnumerable<IAgentStreamingStrategy> strategies,
        SemanticKernelStreamingStrategy fallbackStrategy,
        ILogger<AgentStreamingStrategyFactory> logger)
    {
        _strategies = strategies;
        _fallbackStrategy = fallbackStrategy;
        _logger = logger;
    }

    /// <inheritdoc />
    public IAgentStreamingStrategy GetStrategy(AgentRequest request, AIProvidersSettings settings)
    {
        // Try native strategies first (Anthropic, Gemini, OpenAI, Ollama, Grok)
        foreach (var strategy in _strategies)
        {
            if (strategy.CanHandle(request, settings))
            {
                _logger.LogDebug("Selected strategy {StrategyType} for provider {Provider}",
                    strategy.GetType().Name, request.Provider);
                return strategy;
            }
        }

        // Fall back to Semantic Kernel for other providers or when native isn't available
        _logger.LogDebug("Falling back to SemanticKernelStreamingStrategy for provider {Provider}",
            request.Provider);
        return _fallbackStrategy;
    }
}
