using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Strategy interface for provider-specific agent streaming implementations.
/// Each provider (Anthropic, Gemini, OpenAI, Ollama, Grok) implements this interface.
/// </summary>
public interface IAgentStreamingStrategy
{
    /// <summary>
    /// Provider name(s) this strategy handles (e.g., "claude", "anthropic").
    /// </summary>
    IReadOnlyList<string> SupportedProviders { get; }

    /// <summary>
    /// Check if this strategy can handle the given request.
    /// Considers provider name, feature flags, and configuration.
    /// </summary>
    bool CanHandle(AgentRequest request, AIProvidersSettings settings);

    /// <summary>
    /// Process the agent request and stream events.
    /// </summary>
    IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        CancellationToken cancellationToken = default);
}
