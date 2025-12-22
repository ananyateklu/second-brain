using System.Reflection;
using System.Text.Json.Nodes;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG.Models;
using GeminiFunctionDeclaration = Google.GenAI.Types.FunctionDeclaration;
using OllamaTool = OllamaSharp.Models.Chat.Tool;
using OpenAIChatTool = OpenAI.Chat.ChatTool;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Builds tool definitions from plugins for different AI providers.
/// Uses reflection to discover methods with [KernelFunction] attributes.
/// </summary>
public interface IPluginToolBuilder
{
    /// <summary>
    /// Build Anthropic SDK tools from plugins.
    /// </summary>
    (List<Anthropic.SDK.Common.Tool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildAnthropicTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled,
            RagOptions? ragOptions = null);

    /// <summary>
    /// Build Gemini function declarations from plugins.
    /// </summary>
    (List<GeminiFunctionDeclaration> Declarations, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildGeminiTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled,
            RagOptions? ragOptions = null);

    /// <summary>
    /// Build OpenAI chat tools from plugins.
    /// </summary>
    /// <param name="capabilities">List of capability IDs to enable.</param>
    /// <param name="plugins">Dictionary of available plugins.</param>
    /// <param name="userId">Current user ID.</param>
    /// <param name="agentRagEnabled">Whether RAG is enabled.</param>
    /// <param name="useStrictMode">When true, enables strict mode with additionalProperties: false (for GPT-4o models).</param>
    /// <param name="ragOptions">User-specific RAG options for semantic search customization.</param>
    (List<OpenAIChatTool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildOpenAITools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled,
            bool useStrictMode = false,
            RagOptions? ragOptions = null);

    /// <summary>
    /// Build Ollama tools from plugins.
    /// </summary>
    (List<OllamaTool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildOllamaTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled,
            RagOptions? ragOptions = null);

    /// <summary>
    /// Get JSON schema type string for a .NET type.
    /// </summary>
    string GetJsonSchemaType(Type type);
}
