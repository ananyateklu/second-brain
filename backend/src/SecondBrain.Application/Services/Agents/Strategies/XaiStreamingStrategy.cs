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
/// Native xAI function calling implementation using OpenAI-compatible SDK.
/// </summary>
public class XaiStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly XaiProvider? _xaiProvider;
    private readonly ILogger<XaiStreamingStrategy> _logger;

    public XaiStreamingStrategy(
        XaiProvider? xaiProvider,
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<XaiStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
        _xaiProvider = xaiProvider;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "xai" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        var isXai = request.Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);

        return isXai &&
               _xaiProvider != null &&
               settings.XAI.Enabled &&
               settings.XAI.Features.EnableFunctionCalling &&
               request.Capabilities?.Count > 0;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_xaiProvider == null)
        {
            yield return ErrorEvent("xAI provider is not properly configured");
            yield break;
        }

        yield return StatusEvent("Preparing xAI tools...");

        var request = context.Request;
        var settings = context.Settings;

        // Build tools from plugins (xAI uses OpenAI-compatible format)
        var tools = new List<OpenAIChatTool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        // Build list of capabilities to include
        var capabilitiesToInclude = new HashSet<string>(request.Capabilities ?? new List<string>(), StringComparer.OrdinalIgnoreCase);

        // Auto-include web search capability for xAI when search features are enabled
        if ((settings.XAI.Features.EnableLiveSearch || settings.XAI.Features.EnableDeepSearch) &&
            context.Plugins.ContainsKey("web"))
        {
            capabilitiesToInclude.Add("web");
            _logger.LogDebug("Auto-including web search capability for xAI agent");
        }

        foreach (var capabilityId in capabilitiesToInclude)
        {
            if (!context.Plugins.TryGetValue(capabilityId, out var plugin))
                continue;

            plugin.SetCurrentUserId(request.UserId);
            plugin.SetAgentRagEnabled(request.AgentRagEnabled);
            plugin.SetRagOptions(request.RagOptions);
            plugin.SetAgentContext(request.Provider, request.Model);
            if (request.ContextImages != null)
            {
                plugin.SetContextImages(request.ContextImages);
            }

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

        _logger.LogInformation("Registered {Count} tools for xAI model {Model}: [{ToolNames}]",
            tools.Count, request.Model, string.Join(", ", tools.Select(t => t.FunctionName)));

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
                    // CRITICAL: Use proper OpenAI tool message format, NOT embedded HTML comments.
                    // Embedding tool results as text teaches the model to output similar patterns
                    // instead of using the actual function calling API.

                    // Generate stable IDs for historical tool calls
                    var grokToolCalls = msg.ToolCalls.Select(tc => new Services.AI.Models.GrokToolCallInfo
                    {
                        Id = $"call_{ToolExecutor.GenerateToolId(tc.ToolName, tc.Arguments)}",
                        Name = tc.ToolName,
                        Arguments = tc.Arguments
                    }).ToList();

                    // Create assistant message with tool calls
                    var assistantMsg = XaiProvider.CreateAssistantToolCallMessage(
                        grokToolCalls,
                        textContent: !string.IsNullOrWhiteSpace(msg.Content) ? msg.Content : null);
                    messages.Add(assistantMsg);

                    // Add tool result messages for each tool call
                    foreach (var (tc, grokTc) in msg.ToolCalls.Zip(grokToolCalls))
                    {
                        messages.Add(XaiProvider.CreateToolResultMessage(grokTc.Id, tc.Result));
                    }
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

        var fullResponse = new StringBuilder();
        // Use context.EmittedThinkingBlocks to persist across tool execution iterations
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
            _logger.LogInformation("xAI Think Mode enabled with effort: {Effort}", thinkEffort);
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
            // IMPORTANT: Start from speakable content length (excluding thinking blocks) to avoid re-yielding
            // content from previous iterations. Using fullResponse.Length would skip content when
            // previous iterations contain thinking blocks.
            var lastSpeakableLength = Helpers.ThinkingExtractor.StripThinkingBlocks(fullResponse.ToString()).Length;

            await foreach (var evt in _xaiProvider.StreamWithToolsAsync(
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

                            // Check for thinking blocks - use shared context for deduplication
                            var currentContent = fullResponse.ToString() + iterationText.ToString();
                            foreach (var thinkingContent in ThinkingExtractor.ExtractXmlThinkingBlocks(
                                currentContent, context.EmittedThinkingBlocks))
                            {
                                yield return ThinkingEvent(thinkingContent);
                            }

                            // Extract only new speakable (non-thinking) content from accumulated text
                            // This properly handles thinking blocks that span multiple tokens
                            var speakableContent = Helpers.ThinkingExtractor.ExtractNewSpeakableContent(
                                currentContent, ref lastSpeakableLength);
                            if (!string.IsNullOrEmpty(speakableContent))
                            {
                                yield return TokenEvent(speakableContent);
                            }
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
                        // Handle search results from xAI Live Search
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
                        yield return ErrorEvent($"Error from xAI: {evt.Error}");
                        yield break;
                }
            }

            fullResponse.Append(iterationText);

            _logger.LogDebug("xAI iteration {Iteration} completed. Tool calls received: {ToolCallCount}, Text length: {TextLength}",
                iteration, pendingToolCalls.Count, iterationText.Length);

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

                // Use scope-isolated execution for parallel database safety
                var executionContext = new PluginExecutionContext(
                    UserId: request.UserId,
                    Provider: request.Provider,
                    Model: request.Model,
                    AgentRagEnabled: request.AgentRagEnabled);

                var results = await ToolExecutor.ExecuteMultipleWithScopeIsolationAsync(
                    toolCalls,
                    pluginMethods,
                    executionContext,
                    settings.XAI.FunctionCalling.ParallelExecution,
                    cancellationToken);

                // Add assistant message with tool calls
                // IMPORTANT: Include iterationText to preserve context of what was said before tool execution
                var textBeforeTools = iterationText.ToString();
                var assistantToolCallMessage = XaiProvider.CreateAssistantToolCallMessage(
                    pendingToolCalls.Select(tc => new Services.AI.Models.GrokToolCallInfo
                    {
                        Id = tc.Id,
                        Name = tc.Name,
                        Arguments = tc.Arguments
                    }),
                    textContent: !string.IsNullOrEmpty(textBeforeTools) ? textBeforeTools : null);
                messages.Add(assistantToolCallMessage);

                // Process tool results: extract image data from marker, emit events, store cleaned results
                var imageContentParts = new List<OpenAI.Chat.ChatMessageContentPart>();

                foreach (var result in results)
                {
                    var resultForStorage = result.Result;

                    // Handle AnalyzeImage tool - extract image data from marker, strip before storing
                    // Format: __IMAGE_DATA__mediaType|base64Data__END_IMAGE_DATA__<json>
                    if (result.Name.Equals("AnalyzeImage", StringComparison.OrdinalIgnoreCase))
                    {
                        var (cleanedResult, mediaType, base64Data) = ExtractImageDataFromResult(result.Result);
                        resultForStorage = cleanedResult;

                        // If we extracted image data and model supports vision, inject for THIS request only
                        if (base64Data != null &&
                            AI.Models.MultimodalConfig.IsMultimodalModel("Xai", request.Model))
                        {
                            var dataUrl = $"data:{mediaType ?? "image/png"};base64,{base64Data}";
                            imageContentParts.Add(OpenAI.Chat.ChatMessageContentPart.CreateImagePart(new Uri(dataUrl)));
                            _logger.LogInformation("Extracted image for AnalyzeImage (ephemeral, not stored in history) for model {Model}", request.Model);
                        }
                    }

                    // Emit end event with CLEANED result (no base64) - this is what gets saved to history
                    yield return ToolCallEndEvent(result.Name, result.Id, resultForStorage);

                    // Store cleaned result (no base64) in conversation history for this request
                    messages.Add(XaiProvider.CreateToolResultMessage(result.Id, resultForStorage));
                }

                // If AnalyzeImage returned an image, add it as a follow-up user message for THIS request only
                // Note: This image injection is ephemeral - the cleaned result (no base64) is what gets stored
                if (imageContentParts.Count > 0)
                {
                    imageContentParts.Insert(0, OpenAI.Chat.ChatMessageContentPart.CreateTextPart(
                        "Here is the image from the AnalyzeImage tool. Please analyze it and describe what you see:"));
                    messages.Add(new OpenAI.Chat.UserChatMessage(imageContentParts));
                    _logger.LogInformation("Injected image for model vision (ephemeral) for xAI model {Model}", request.Model);
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
                "xAI token usage - Input: {Input}, Output: {Output}, Reasoning: {Reasoning}, Total: {Total}",
                totalInputTokens, totalOutputTokens, totalReasoningTokens,
                totalInputTokens + totalOutputTokens + totalReasoningTokens);
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens > 0 ? totalInputTokens : null,
            outputTokens: totalOutputTokens > 0 ? totalOutputTokens : null,
            reasoningTokens: totalReasoningTokens > 0 ? totalReasoningTokens : null);
    }

    /// <summary>
    /// Extract image data from AnalyzeImage result marker format.
    /// Format: __IMAGE_DATA__mediaType|base64Data__END_IMAGE_DATA__&lt;json&gt;
    /// Returns (cleanedResult, mediaType, base64Data) where cleanedResult has the marker stripped.
    /// </summary>
    private (string CleanedResult, string? MediaType, string? Base64Data) ExtractImageDataFromResult(string result)
    {
        const string startMarker = "__IMAGE_DATA__";
        const string endMarker = "__END_IMAGE_DATA__";

        if (!result.StartsWith(startMarker))
        {
            return (result, null, null);
        }

        var endIndex = result.IndexOf(endMarker);
        if (endIndex < 0)
        {
            _logger.LogWarning("AnalyzeImage result has start marker but no end marker");
            return (result, null, null);
        }

        try
        {
            // Extract the data between markers: mediaType|base64Data
            var dataSection = result.Substring(startMarker.Length, endIndex - startMarker.Length);
            var pipeIndex = dataSection.IndexOf('|');

            if (pipeIndex < 0)
            {
                _logger.LogWarning("AnalyzeImage data section missing pipe separator");
                return (result, null, null);
            }

            var mediaType = dataSection.Substring(0, pipeIndex);
            var base64Data = dataSection.Substring(pipeIndex + 1);

            // The cleaned result is everything after the end marker (the JSON)
            var cleanedResult = result.Substring(endIndex + endMarker.Length);

            _logger.LogDebug("Extracted image data: mediaType={MediaType}, base64Length={Length}",
                mediaType, base64Data.Length);

            return (cleanedResult, mediaType, base64Data);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract image data from AnalyzeImage result");
            return (result, null, null);
        }
    }
}
