using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Encapsulates all context needed for provider streaming strategies.
/// Passed to strategies to avoid them needing many constructor dependencies.
/// </summary>
public class AgentStreamingContext
{
    /// <summary>
    /// The original agent request.
    /// </summary>
    public required AgentRequest Request { get; init; }

    /// <summary>
    /// AI provider settings (API keys, feature flags, etc.).
    /// </summary>
    public required AIProvidersSettings Settings { get; init; }

    /// <summary>
    /// RAG settings (TopK, threshold, etc.).
    /// </summary>
    public required RagSettings RagSettings { get; init; }

    /// <summary>
    /// Available plugins keyed by capability ID.
    /// </summary>
    public required IReadOnlyDictionary<string, IAgentPlugin> Plugins { get; init; }

    /// <summary>
    /// Logger for the strategy.
    /// </summary>
    public required ILogger Logger { get; init; }

    /// <summary>
    /// RAG service for context retrieval.
    /// </summary>
    public required IRagService RagService { get; init; }

    /// <summary>
    /// User preferences service.
    /// </summary>
    public required IUserPreferencesService UserPreferencesService { get; init; }

    /// <summary>
    /// System prompt generator function.
    /// </summary>
    public required Func<List<string>?, string> GetSystemPrompt { get; init; }
}
