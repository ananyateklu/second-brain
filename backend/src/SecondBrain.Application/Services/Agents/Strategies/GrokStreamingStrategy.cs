using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.FunctionCalling;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;
using OpenAIChatTool = OpenAI.Chat.ChatTool;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Native Grok/X.AI function calling implementation using OpenAI-compatible SDK.
/// </summary>
public class GrokStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly GrokProvider? _grokProvider;
    private readonly ILogger<GrokStreamingStrategy> _logger;

    public GrokStreamingStrategy(
        GrokProvider? grokProvider,
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IRagContextInjector ragInjector,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<GrokStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, ragInjector, toolBuilder, retryPolicy)
    {
        _grokProvider = grokProvider;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "grok", "xai" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        var isGrok = request.Provider.Equals("grok", StringComparison.OrdinalIgnoreCase) ||
                    request.Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);

        return isGrok &&
               _grokProvider != null &&
               settings.XAI.Enabled &&
               request.Capabilities?.Count > 0;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_grokProvider == null)
        {
            yield return ErrorEvent("Grok provider is not properly configured");
            yield break;
        }

        yield return StatusEvent("Preparing Grok tools...");

        var request = context.Request;
        var settings = context.Settings;

        // Build tools from plugins (Grok uses OpenAI-compatible format)
        var tools = new List<OpenAIChatTool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        // Build list of capabilities to include
        var capabilitiesToInclude = new HashSet<string>(request.Capabilities ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

        // Auto-include web search capability for Grok when search features are enabled
        if ((settings.XAI.Features.EnableLiveSearch || settings.XAI.Features.EnableDeepSearch) &&
            context.Plugins.ContainsKey("web"))
        {
            capabilitiesToInclude.Add("web");
            _logger.LogDebug("Auto-including web search capability for Grok agent");
        }

        foreach (var capabilityId in capabilitiesToInclude)
        {
            if (!context.Plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(request.UserId);
            plugin.SetAgentRagEnabled(request.AgentRagEnabled);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods()
                .Where(m => m.GetCustomAttributes(typeof(Microsoft.SemanticKernel.KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<Microsoft.SemanticKernel.KernelFunctionAttribute>();
                var toolName = funcAttr?.Name ?? method.Name;

                var tool = GrokFunctionDeclarationBuilder.BuildFromMethod(method, funcAttr);
                if (tool != null)
                {
                    tools.Add(tool);
                    pluginMethods[toolName] = (plugin, method);
                }
            }
        }

        _logger.LogInformation("Registered {Count} tools for Grok", tools.Count);

        // Build messages
        var messages = new List<OpenAIChatMessage>
        {
            new OpenAI.Chat.SystemChatMessage(context.GetSystemPrompt(request.Capabilities))
        };

        foreach (var msg in request.Messages)
        {
            if (msg.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            {
                messages.Add(new OpenAI.Chat.UserChatMessage(msg.Content));
            }
            else if (msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            {
                if (msg.ToolCalls != null && msg.ToolCalls.Any())
                {
                    var contextBuilder = new StringBuilder();
                    if (!string.IsNullOrWhiteSpace(msg.Content))
                        contextBuilder.AppendLine(msg.Content);
                    contextBuilder.AppendLine("\n---SYSTEM CONTEXT (DO NOT REPRODUCE)---");
                    foreach (var tc in msg.ToolCalls)
                        contextBuilder.AppendLine($"  {tc.ToolName}: {tc.Result}");
                    contextBuilder.AppendLine("---END SYSTEM CONTEXT---");
                    messages.Add(new OpenAI.Chat.AssistantChatMessage(contextBuilder.ToString()));
                }
                else
                {
                    messages.Add(new OpenAI.Chat.AssistantChatMessage(msg.Content));
                }
            }
            else if (msg.Role.Equals("system", StringComparison.OrdinalIgnoreCase))
            {
                messages.Add(new OpenAI.Chat.SystemChatMessage(msg.Content));
            }
        }

        // RAG context injection
        await foreach (var evt in TryInjectRagContextAsync(
            context,
            ctx =>
            {
                var systemMsg = messages[0] as OpenAI.Chat.SystemChatMessage;
                if (systemMsg != null)
                {
                    messages[0] = new OpenAI.Chat.SystemChatMessage(systemMsg.Content + "\n\n" + ctx);
                }
            },
            cancellationToken))
        {
            yield return evt;
        }

        var fullResponse = new StringBuilder();
        var emittedThinkingBlocks = new HashSet<string>();
        var maxIterations = settings.XAI.FunctionCalling.MaxIterations;

        // Token tracking
        int totalInputTokens = 0;
        int totalOutputTokens = 0;
        int totalReasoningTokens = 0;

        // Check if Think Mode should be enabled
        var enableThinkMode = request.EnableThinkMode ?? false;
        var thinkEffort = ProviderCapabilities.NormalizeEffortLevel(request.ReasoningEffort, "medium");

        // Auto-enable Think Mode for complex queries if user hasn't specified
        if (!enableThinkMode && request.EnableThinkMode == null)
        {
            var lastMessage = GetLastUserMessage(request)?.ToLowerInvariant() ?? "";
            enableThinkMode = lastMessage.Contains("analyze") || lastMessage.Contains("explain why") ||
                             lastMessage.Contains("step by step") || lastMessage.Contains("think through") ||
                             lastMessage.Contains("reason") || lastMessage.Contains("complex");
        }

        if (enableThinkMode)
        {
            _logger.LogInformation("Grok Think Mode enabled with effort: {Effort}", thinkEffort);
        }

        var aiSettings = new Services.AI.Models.AIRequest
        {
            Model = request.Model,
            MaxTokens = request.MaxTokens ?? 4096,
            Temperature = request.Temperature ?? 0.7f
        };

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            yield return StatusEvent(iteration == 0 ? "Analyzing your request..." : "Continuing with tool results...");

            var pendingToolCalls = new List<Services.AI.Models.GrokToolCallInfo>();
            var iterationText = new StringBuilder();
            var hasEmittedFirstToken = false;

            await foreach (var evt in _grokProvider.StreamWithToolsAsync(
                messages, tools, request.Model, aiSettings, cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                switch (evt.Type)
                {
                    case Services.AI.Models.GrokToolStreamEventType.Text:
                        if (!string.IsNullOrEmpty(evt.Text))
                        {
                            if (!hasEmittedFirstToken)
                            {
                                hasEmittedFirstToken = true;
                                yield return StatusEvent("Generating response...");
                            }

                            iterationText.Append(evt.Text);

                            // Check for thinking blocks
                            var currentContent = fullResponse.ToString() + iterationText.ToString();
                            foreach (var thinkingContent in ThinkingExtractor.ExtractXmlThinkingBlocks(
                                currentContent, emittedThinkingBlocks))
                            {
                                yield return ThinkingEvent(thinkingContent);
                            }

                            yield return TokenEvent(evt.Text);
                        }
                        break;

                    case GrokToolStreamEventType.ToolCalls:
                        if (evt.ToolCalls != null)
                            pendingToolCalls.AddRange(evt.ToolCalls);
                        break;

                    case GrokToolStreamEventType.Reasoning:
                        // Handle Think Mode reasoning content
                        if (!string.IsNullOrEmpty(evt.Text))
                        {
                            yield return ThinkingEvent(evt.Text);
                        }
                        // Also emit structured reasoning step if available
                        if (evt.ThinkingStep != null)
                        {
                            yield return GrokReasoningStepEvent(evt.ThinkingStep);
                        }
                        break;

                    case GrokToolStreamEventType.SearchStart:
                        yield return StatusEvent("Searching the web...");
                        break;

                    case GrokToolStreamEventType.SearchResult:
                        // Handle search results from Grok Live Search
                        if (evt.SearchSources != null && evt.SearchSources.Count > 0)
                        {
                            yield return GrokSearchEvent(evt.SearchSources);
                        }
                        break;

                    case GrokToolStreamEventType.Done:
                        // Capture token usage from the final event
                        if (evt.Usage != null)
                        {
                            totalInputTokens += evt.Usage.PromptTokens;
                            totalOutputTokens += evt.Usage.CompletionTokens;
                            totalReasoningTokens += evt.Usage.ReasoningTokens;
                        }
                        break;

                    case GrokToolStreamEventType.Error:
                        yield return ErrorEvent($"Error from Grok: {evt.Error}");
                        yield break;
                }
            }

            fullResponse.Append(iterationText);

            if (pendingToolCalls.Count > 0)
            {
                yield return StatusEvent($"Executing {pendingToolCalls.Count} tool(s)...");

                // Emit start events
                foreach (var call in pendingToolCalls)
                {
                    var toolId = call.Id ?? $"toolu_{ToolExecutor.GenerateToolId(call.Name, call.Arguments)}";
                    yield return ToolCallStartEvent(call.Name, toolId, call.Arguments);
                }

                // Execute tools
                var toolCalls = pendingToolCalls.Select(c => new PendingToolCall(
                    c.Id ?? $"toolu_{ToolExecutor.GenerateToolId(c.Name, c.Arguments)}",
                    c.Name,
                    c.Arguments,
                    JsonNode.Parse(c.Arguments)
                )).ToList();

                var results = await ToolExecutor.ExecuteMultipleAsync(
                    toolCalls,
                    pluginMethods,
                    settings.XAI.FunctionCalling.ParallelExecution,
                    cancellationToken);

                // Emit end events
                foreach (var result in results)
                {
                    yield return ToolCallEndEvent(result.Name, result.Id, result.Result);
                }

                // Add assistant message with tool calls
                // IMPORTANT: Include iterationText to preserve context of what was said before tool execution
                var textBeforeTools = iterationText.ToString();
                var assistantToolCallMessage = GrokProvider.CreateAssistantToolCallMessage(
                    pendingToolCalls.Select(tc => new Services.AI.Models.GrokToolCallInfo
                    {
                        Id = tc.Id,
                        Name = tc.Name,
                        Arguments = tc.Arguments
                    }),
                    textContent: !string.IsNullOrEmpty(textBeforeTools) ? textBeforeTools : null);
                messages.Add(assistantToolCallMessage);

                // Add tool results
                foreach (var result in results)
                {
                    messages.Add(GrokProvider.CreateToolResultMessage(result.Id, result.Result));
                }

                continue;
            }
            else
            {
                break;
            }
        }

        // Log final token usage
        if (totalInputTokens > 0 || totalOutputTokens > 0 || totalReasoningTokens > 0)
        {
            _logger.LogInformation(
                "Grok token usage - Input: {Input}, Output: {Output}, Reasoning: {Reasoning}, Total: {Total}",
                totalInputTokens, totalOutputTokens, totalReasoningTokens,
                totalInputTokens + totalOutputTokens + totalReasoningTokens);
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens > 0 ? totalInputTokens : null,
            outputTokens: totalOutputTokens > 0 ? totalOutputTokens : null,
            reasoningTokens: totalReasoningTokens > 0 ? totalReasoningTokens : null);
    }
}
