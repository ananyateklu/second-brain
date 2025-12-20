using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.Providers;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Native OpenAI function calling implementation using OpenAI SDK.
/// Supports parallel function execution and streaming responses.
/// </summary>
public class OpenAIStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly OpenAIProvider? _openAIProvider;
    private readonly ILogger<OpenAIStreamingStrategy> _logger;

    public OpenAIStreamingStrategy(
        OpenAIProvider? openAIProvider,
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<OpenAIStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
        _openAIProvider = openAIProvider;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "openai" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        return request.Provider.Equals("openai", StringComparison.OrdinalIgnoreCase) &&
               _openAIProvider != null &&
               settings.OpenAI.Features.EnableFunctionCalling &&
               request.Capabilities?.Count > 0;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_openAIProvider == null)
        {
            yield return ErrorEvent("OpenAI provider is not properly configured");
            yield break;
        }

        yield return StatusEvent("Preparing OpenAI tools...");

        var request = context.Request;
        var settings = context.Settings;

        // Determine if strict mode should be used (GPT-4o models support structured outputs)
        var useStrictMode = ProviderCapabilities.SupportsStrictToolMode("openai", request.Model);
        if (useStrictMode)
        {
            _logger.LogDebug("Enabling strict mode for model {Model}", request.Model);
        }

        // Build tools from plugins
        var (tools, pluginMethods) = ToolBuilder.BuildOpenAITools(
            request.Capabilities ?? new List<string>(),
            context.Plugins,
            request.UserId,
            request.AgentRagEnabled,
            useStrictMode);

        _logger.LogInformation("Registered {Count} tools for OpenAI (strict: {Strict})", tools.Count, useStrictMode);

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

        var fullResponse = new StringBuilder();
        var emittedThinkingBlocks = new HashSet<string>();
        var maxIterations = settings.OpenAI.FunctionCalling.MaxIterations;

        // Token tracking
        int totalInputTokens = 0;
        int totalOutputTokens = 0;

        var aiSettings = new Services.AI.Models.AIRequest
        {
            Model = request.Model,
            MaxTokens = request.MaxTokens ?? 4096,
            Temperature = request.Temperature ?? 0.7f
        };

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            yield return StatusEvent(iteration == 0 ? "Analyzing your request..." : "Continuing with tool results...");

            var pendingToolCalls = new List<Services.AI.Models.OpenAIToolCallInfo>();
            var iterationText = new StringBuilder();
            var hasEmittedFirstToken = false;
            var lastSpeakableLength = 0; // Track how much speakable content we've already yielded

            await foreach (var evt in _openAIProvider.StreamWithToolsAsync(
                messages, tools, request.Model, aiSettings, cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                switch (evt.Type)
                {
                    case Services.AI.Models.OpenAIToolStreamEventType.Text:
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

                    case Services.AI.Models.OpenAIToolStreamEventType.ToolCalls:
                        if (evt.ToolCalls != null)
                            pendingToolCalls.AddRange(evt.ToolCalls);
                        break;

                    case Services.AI.Models.OpenAIToolStreamEventType.Done:
                        // Capture token usage from the final event
                        if (evt.Usage != null)
                        {
                            totalInputTokens += evt.Usage.PromptTokens;
                            totalOutputTokens += evt.Usage.CompletionTokens;
                        }
                        break;

                    case Services.AI.Models.OpenAIToolStreamEventType.Error:
                        yield return ErrorEvent($"Error from OpenAI: {evt.Error}");
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
                    settings.OpenAI.FunctionCalling.ParallelExecution,
                    cancellationToken);

                // Emit end events
                foreach (var result in results)
                {
                    yield return ToolCallEndEvent(result.Name, result.Id, result.Result);
                }

                // Add assistant message with tool calls
                // IMPORTANT: Include iterationText to preserve context of what was said before tool execution
                var textBeforeTools = iterationText.ToString();
                var assistantToolCallMessage = OpenAIProvider.CreateAssistantToolCallMessage(
                    pendingToolCalls.Select(tc => new Services.AI.Models.OpenAIToolCallInfo
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
                    messages.Add(OpenAIProvider.CreateToolResultMessage(result.Id, result.Result));
                }

                continue;
            }
            else
            {
                break;
            }
        }

        // Log final token usage
        if (totalInputTokens > 0 || totalOutputTokens > 0)
        {
            _logger.LogInformation(
                "OpenAI token usage - Input: {Input}, Output: {Output}, Total: {Total}",
                totalInputTokens, totalOutputTokens, totalInputTokens + totalOutputTokens);
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens > 0 ? totalInputTokens : null,
            outputTokens: totalOutputTokens > 0 ? totalOutputTokens : null);
    }
}
