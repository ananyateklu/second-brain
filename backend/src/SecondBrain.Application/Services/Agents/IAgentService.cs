using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents;

public interface IAgentService
{
    IAsyncEnumerable<AgentStreamEvent> ProcessStreamAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default);

    Task<AgentResponse> ProcessAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all available agent capabilities
    /// </summary>
    IReadOnlyList<AgentCapability> GetAvailableCapabilities();
}
