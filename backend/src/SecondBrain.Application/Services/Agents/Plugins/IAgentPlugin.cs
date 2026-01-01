using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.RAG.Models;

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
    /// Set whether automatic RAG context retrieval is enabled.
    /// When disabled, the system prompt should not include instructions about automatically retrieved context.
    /// </summary>
    void SetAgentRagEnabled(bool enabled);

    /// <summary>
    /// Set user-specific RAG options to customize RAG pipeline behavior.
    /// These options override default settings for HyDE, hybrid search, reranking, etc.
    /// </summary>
    void SetRagOptions(RagOptions? options);

    /// <summary>
    /// Set the AI agent context (provider and model) for operations.
    /// This allows plugins to track which AI model performed note operations.
    /// </summary>
    /// <param name="provider">The AI provider name (e.g., "Anthropic", "Google", "OpenAI")</param>
    /// <param name="model">The model identifier (e.g., "claude-3-5-sonnet", "gemini-2.0-flash")</param>
    void SetAgentContext(string provider, string model);

    /// <summary>
    /// Set context images from the current message for image attachment operations.
    /// Images can be referenced by index (e.g., "img1", "img2") in tool calls.
    /// </summary>
    /// <param name="images">List of context images from the current message.</param>
    void SetContextImages(IReadOnlyList<ContextImage>? images);

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
