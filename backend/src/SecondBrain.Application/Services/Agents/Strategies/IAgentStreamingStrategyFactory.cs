using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Factory for selecting the appropriate streaming strategy based on the request.
/// </summary>
public interface IAgentStreamingStrategyFactory
{
    /// <summary>
    /// Get the appropriate streaming strategy for the request.
    /// Returns the first matching native strategy, or falls back to Semantic Kernel.
    /// </summary>
    IAgentStreamingStrategy GetStrategy(AgentRequest request, AIProvidersSettings settings);
}
