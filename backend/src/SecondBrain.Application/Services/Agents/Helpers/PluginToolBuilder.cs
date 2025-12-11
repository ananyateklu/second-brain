using System.Reflection;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.FunctionCalling;
using GeminiFunctionDeclaration = Google.GenAI.Types.FunctionDeclaration;
using OllamaTool = OllamaSharp.Models.Chat.Tool;
using OpenAIChatTool = OpenAI.Chat.ChatTool;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Builds tool definitions from plugins for different AI providers.
/// </summary>
public class PluginToolBuilder : IPluginToolBuilder
{
    private readonly ILogger<PluginToolBuilder> _logger;

    public PluginToolBuilder(ILogger<PluginToolBuilder> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public (List<Anthropic.SDK.Common.Tool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildAnthropicTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled)
    {
        var tools = new List<Anthropic.SDK.Common.Tool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        foreach (var capabilityId in capabilities)
        {
            if (!plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(userId);
            plugin.SetAgentRagEnabled(agentRagEnabled);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods()
                .Where(m => m.GetCustomAttributes(typeof(KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
                var descAttr = method.GetCustomAttribute<System.ComponentModel.DescriptionAttribute>();

                var toolName = funcAttr?.Name ?? method.Name;
                var toolDescription = descAttr?.Description ?? "";

                // Build input schema as JsonNode for the Tool constructor
                var schemaObj = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject(),
                    ["required"] = new JsonArray()
                };

                var propsNode = schemaObj["properties"]!.AsObject();
                var requiredNode = schemaObj["required"]!.AsArray();

                foreach (var param in method.GetParameters())
                {
                    var paramDesc = param.GetCustomAttribute<System.ComponentModel.DescriptionAttribute>();
                    var paramType = param.ParameterType;

                    var propNode = new JsonObject
                    {
                        ["type"] = GetJsonSchemaType(paramType)
                    };

                    if (paramDesc != null)
                    {
                        propNode["description"] = paramDesc.Description;
                    }

                    propsNode[param.Name!] = propNode;

                    if (!param.HasDefaultValue && Nullable.GetUnderlyingType(paramType) == null)
                    {
                        requiredNode.Add(param.Name!);
                    }
                }

                var function = new Anthropic.SDK.Common.Function(toolName, toolDescription, schemaObj);
                tools.Add(new Anthropic.SDK.Common.Tool(function));
                pluginMethods[toolName] = (plugin, method);

                _logger.LogDebug("Registered Anthropic tool {ToolName} with schema: {Schema}",
                    toolName, schemaObj.ToJsonString());
            }
        }

        return (tools, pluginMethods);
    }

    /// <inheritdoc />
    public (List<GeminiFunctionDeclaration> Declarations, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildGeminiTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled)
    {
        var functionDeclarations = new List<GeminiFunctionDeclaration>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        foreach (var capabilityId in capabilities)
        {
            if (!plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(userId);
            plugin.SetAgentRagEnabled(agentRagEnabled);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods()
                .Where(m => m.GetCustomAttributes(typeof(KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
                var toolName = funcAttr?.Name ?? method.Name;

                var declaration = GeminiFunctionDeclarationBuilder.BuildFromMethod(method, funcAttr);
                if (declaration != null)
                {
                    functionDeclarations.Add(declaration);
                    pluginMethods[toolName] = (plugin, method);
                    _logger.LogDebug("Registered Gemini function: {FunctionName}", toolName);
                }
            }
        }

        _logger.LogInformation("Registered {Count} function declarations for Gemini", functionDeclarations.Count);
        return (functionDeclarations, pluginMethods);
    }

    /// <inheritdoc />
    public (List<OpenAIChatTool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildOpenAITools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled,
            bool useStrictMode = false)
    {
        var tools = new List<OpenAIChatTool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        foreach (var capabilityId in capabilities)
        {
            if (!plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(userId);
            plugin.SetAgentRagEnabled(agentRagEnabled);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods()
                .Where(m => m.GetCustomAttributes(typeof(KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
                var toolName = funcAttr?.Name ?? method.Name;

                var tool = OpenAIFunctionDeclarationBuilder.BuildFromMethod(method, funcAttr, useStrictMode);
                if (tool != null)
                {
                    tools.Add(tool);
                    pluginMethods[toolName] = (plugin, method);
                    _logger.LogDebug("Registered OpenAI tool: {ToolName} (strict: {Strict})", toolName, useStrictMode);
                }
            }
        }

        _logger.LogInformation("Registered {Count} tools for OpenAI (strict mode: {Strict})", tools.Count, useStrictMode);
        return (tools, pluginMethods);
    }

    /// <inheritdoc />
    public (List<OllamaTool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods)
        BuildOllamaTools(
            IEnumerable<string> capabilities,
            IReadOnlyDictionary<string, IAgentPlugin> plugins,
            string userId,
            bool agentRagEnabled)
    {
        var tools = new List<OllamaTool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        foreach (var capabilityId in capabilities)
        {
            if (!plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(userId);
            plugin.SetAgentRagEnabled(agentRagEnabled);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods()
                .Where(m => m.GetCustomAttributes(typeof(KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
                var toolName = funcAttr?.Name ?? method.Name;

                var tool = OllamaFunctionDeclarationBuilder.BuildFromMethod(method, funcAttr);
                if (tool != null)
                {
                    tools.Add(tool);
                    pluginMethods[toolName] = (plugin, method);
                    _logger.LogDebug("Registered Ollama tool: {ToolName}", toolName);
                }
            }
        }

        _logger.LogInformation("Registered {Count} tools for Ollama", tools.Count);
        return (tools, pluginMethods);
    }

    /// <inheritdoc />
    public string GetJsonSchemaType(Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string)) return "string";
        if (underlyingType == typeof(int) || underlyingType == typeof(long)) return "integer";
        if (underlyingType == typeof(float) || underlyingType == typeof(double) || underlyingType == typeof(decimal)) return "number";
        if (underlyingType == typeof(bool)) return "boolean";
        if (underlyingType.IsArray || (underlyingType.IsGenericType && underlyingType.GetGenericTypeDefinition() == typeof(List<>))) return "array";

        return "string";
    }
}
