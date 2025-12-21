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

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Native Ollama function calling implementation using OllamaSharp SDK.
/// Supports local model execution with tool support.
/// </summary>
public class OllamaStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly OllamaProvider? _ollamaProvider;
    private readonly ILogger<OllamaStreamingStrategy> _logger;

    public OllamaStreamingStrategy(
        OllamaProvider? ollamaProvider,
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<OllamaStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
        _ollamaProvider = ollamaProvider;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "ollama" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        return request.Provider.Equals("ollama", StringComparison.OrdinalIgnoreCase) &&
               _ollamaProvider != null &&
               settings.Ollama.Features.EnableFunctionCalling &&
               request.Capabilities?.Count > 0;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_ollamaProvider == null)
        {
            yield return ErrorEvent("Ollama provider is not properly configured");
            yield break;
        }

        yield return StatusEvent("Preparing Ollama tools...");

        var request = context.Request;
        var settings = context.Settings;

        // Build tools from plugins
        var (tools, pluginMethods) = ToolBuilder.BuildOllamaTools(
            request.Capabilities ?? new List<string>(),
            context.Plugins,
            request.UserId,
            request.AgentRagEnabled);

        _logger.LogInformation("Registered {Count} tools for Ollama", tools.Count);

        // Build messages
        var messages = new List<Services.AI.Models.ChatMessage>
        {
            new() { Role = "system", Content = context.GetSystemPrompt(request.Capabilities) }
        };

        foreach (var msg in request.Messages)
        {
            if (msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) &&
                msg.ToolCalls != null && msg.ToolCalls.Any())
            {
                var contextBuilder = new StringBuilder();
                if (!string.IsNullOrWhiteSpace(msg.Content))
                    contextBuilder.AppendLine(msg.Content);
                contextBuilder.AppendLine("\n---SYSTEM CONTEXT (DO NOT REPRODUCE)---");
                foreach (var tc in msg.ToolCalls)
                    contextBuilder.AppendLine($"  {tc.ToolName}: {tc.Result}");
                contextBuilder.AppendLine("---END SYSTEM CONTEXT---");
                messages.Add(new Services.AI.Models.ChatMessage { Role = msg.Role, Content = contextBuilder.ToString() });
            }
            else
            {
                messages.Add(new Services.AI.Models.ChatMessage { Role = msg.Role, Content = msg.Content });
            }
        }

        var fullResponse = new StringBuilder();
        var emittedThinkingBlocks = new HashSet<string>();
        var maxIterations = settings.Ollama.FunctionCalling.MaxIterations;

        // Token tracking
        int totalInputTokens = 0;
        int totalOutputTokens = 0;

        // Check if model supports thinking mode (deepseek-r1, qwen, etc.)
        var supportsThinking = ProviderCapabilities.SupportsNativeThinking("ollama", request.Model);
        if (supportsThinking)
        {
            _logger.LogDebug("Model {Model} supports thinking mode", request.Model);
        }

        var aiSettings = new Services.AI.Models.AIRequest
        {
            Model = request.Model,
            MaxTokens = request.MaxTokens ?? 4096,
            Temperature = request.Temperature ?? 0.7f,
            OllamaBaseUrl = request.OllamaBaseUrl
        };

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            yield return StatusEvent(iteration == 0 ? "Analyzing your request..." : "Continuing with tool results...");

            var pendingToolCalls = new List<Services.AI.Models.OllamaToolCallInfo>();
            var iterationText = new StringBuilder();
            var hasEmittedFirstToken = false;
            var lastSpeakableLength = 0; // Track how much speakable content we've already yielded

            await foreach (var evt in _ollamaProvider.StreamWithToolsAsync(
                messages, tools, aiSettings, cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                switch (evt.Type)
                {
                    case Services.AI.Models.OllamaToolStreamEventType.Text:
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

                    case Services.AI.Models.OllamaToolStreamEventType.ToolCalls:
                        if (evt.ToolCalls != null)
                            pendingToolCalls.AddRange(evt.ToolCalls);
                        break;

                    case Services.AI.Models.OllamaToolStreamEventType.Thinking:
                        // Handle native thinking content from models like deepseek-r1
                        if (!string.IsNullOrEmpty(evt.Text) && !emittedThinkingBlocks.Contains(evt.Text))
                        {
                            emittedThinkingBlocks.Add(evt.Text);
                            yield return ThinkingEvent(evt.Text);
                        }
                        break;

                    case Services.AI.Models.OllamaToolStreamEventType.Done:
                        // Capture token usage from the final event
                        if (evt.Usage != null)
                        {
                            totalInputTokens += evt.Usage.PromptTokens;
                            totalOutputTokens += evt.Usage.CompletionTokens;
                        }
                        break;

                    case Services.AI.Models.OllamaToolStreamEventType.Error:
                        yield return ErrorEvent($"Error from Ollama: {evt.Error}");
                        yield break;
                }
            }

            fullResponse.Append(iterationText);

            if (pendingToolCalls.Count > 0)
            {
                yield return StatusEvent($"Executing {pendingToolCalls.Count} tool(s)...");

                // Create tool IDs and emit start events
                var ollamaToolIds = new Dictionary<string, string>();
                foreach (var call in pendingToolCalls)
                {
                    var ollamaToolId = $"toolu_{ToolExecutor.GenerateToolId(call.Name, call.Arguments)}";
                    ollamaToolIds[call.Name] = ollamaToolId;
                    yield return ToolCallStartEvent(call.Name, ollamaToolId, call.Arguments);
                }

                // Execute tools
                var toolCalls = pendingToolCalls.Select(c => new PendingToolCall(
                    ollamaToolIds[c.Name],
                    c.Name,
                    c.Arguments,
                    JsonNode.Parse(c.Arguments)
                )).ToList();

                var results = await ToolExecutor.ExecuteMultipleAsync(
                    toolCalls,
                    pluginMethods,
                    settings.Ollama.FunctionCalling.ParallelExecution,
                    cancellationToken);

                // Emit end events
                foreach (var result in results)
                {
                    yield return ToolCallEndEvent(result.Name, result.Id, result.Result);
                }

                // Add assistant message if there was text content
                if (iterationText.Length > 0)
                {
                    messages.Add(new Services.AI.Models.ChatMessage
                    {
                        Role = "assistant",
                        Content = iterationText.ToString()
                    });
                }

                // Add tool results
                foreach (var result in results)
                {
                    messages.Add(new Services.AI.Models.ChatMessage
                    {
                        Role = "tool",
                        Content = $"[{result.Name}]: {result.Result}"
                    });
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
                "Ollama token usage - Input: {Input}, Output: {Output}, Total: {Total}",
                totalInputTokens, totalOutputTokens, totalInputTokens + totalOutputTokens);
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens > 0 ? totalInputTokens : null,
            outputTokens: totalOutputTokens > 0 ? totalOutputTokens : null);
    }
}
