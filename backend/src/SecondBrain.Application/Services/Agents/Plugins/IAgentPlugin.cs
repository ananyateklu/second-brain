using Microsoft.SemanticKernel;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Interface for agent plugins that provide tool capabilities.
/// Implement this interface to add new tool sets to the agent.
/// </summary>
public interface IAgentPlugin
{
    /// <summary>
    /// Unique identifier for this plugin capability (e.g., "notes", "web", "calendar")
    /// </summary>
    string CapabilityId { get; }

    /// <summary>
    /// Human-readable name for the capability
    /// </summary>
    string DisplayName { get; }

    /// <summary>
    /// Description of what tools this plugin provides
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Set the current user context for operations
    /// </summary>
    void SetCurrentUserId(string userId);

    /// <summary>
    /// Get the plugin object to register with Semantic Kernel
    /// </summary>
    object GetPluginInstance();

    /// <summary>
    /// Get the plugin name for registration with Semantic Kernel
    /// </summary>
    string GetPluginName();

    /// <summary>
    /// Get the system prompt additions specific to this plugin's tools.
    /// This will be appended to the base system prompt when the plugin is active.
    /// </summary>
    string GetSystemPromptAddition();
}
