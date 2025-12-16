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
using GeminiFunctionDeclaration = Google.GenAI.Types.FunctionDeclaration;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Native Gemini function calling implementation using Google GenAI SDK.
/// Supports parallel function execution, grounding, and code execution.
/// </summary>
public class GeminiStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly GeminiProvider? _geminiProvider;
    private readonly ILogger<GeminiStreamingStrategy> _logger;

    public GeminiStreamingStrategy(
        GeminiProvider? geminiProvider,
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IRagContextInjector ragInjector,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<GeminiStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, ragInjector, toolBuilder, retryPolicy)
    {
        _geminiProvider = geminiProvider;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "gemini" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        return request.Provider.Equals("gemini", StringComparison.OrdinalIgnoreCase) &&
               _geminiProvider != null &&
               settings.Gemini.Features.EnableFunctionCalling &&
               request.Capabilities?.Count > 0;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_geminiProvider == null)
        {
            yield return ErrorEvent("Gemini provider is not properly configured");
            yield break;
        }

        yield return StatusEvent("Preparing Gemini tools...");

        var request = context.Request;
        var settings = context.Settings;

        // Build function declarations from plugins
        var (functionDeclarations, pluginMethods) = ToolBuilder.BuildGeminiTools(
            request.Capabilities ?? new List<string>(),
            context.Plugins,
            request.UserId,
            request.AgentRagEnabled);

        _logger.LogInformation("Registered {Count} function declarations for Gemini", functionDeclarations.Count);

        // Build messages
        var messages = new List<Services.AI.Models.ChatMessage>
        {
            new() { Role = "system", Content = context.GetSystemPrompt(request.Capabilities) }
        };

        // Convert request messages
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

        // RAG context injection
        var lastUserMessage = GetLastUserMessage(request);
        await foreach (var evt in TryInjectRagContextAsync(
            context,
            ctx => messages[0].Content += "\n\n" + ctx,
            cancellationToken))
        {
            yield return evt;
        }

        var fullResponse = new StringBuilder();
        var emittedThinkingBlocks = new HashSet<string>();
        var maxIterations = 10;

        // Token tracking (from Gemini UsageMetadata in Complete event)
        int? totalInputTokens = null;
        int? totalOutputTokens = null;
        int? cachedTokens = null;
        int groundingSourceCount = 0;

        var aiSettings = new Services.AI.Models.AIRequest
        {
            Model = request.Model,
            MaxTokens = request.MaxTokens ?? 4096,
            Temperature = request.Temperature ?? 0.7f
        };

        // Detect if query might benefit from Gemini's unique features
        var queryLower = lastUserMessage?.ToLowerInvariant() ?? "";
        var mightNeedRealTimeInfo = queryLower.Contains("latest") || queryLower.Contains("current") ||
                                    queryLower.Contains("today") || queryLower.Contains("news") ||
                                    queryLower.Contains("weather") || queryLower.Contains("stock");
        var mightNeedCalculation = queryLower.Contains("calculate") || queryLower.Contains("compute") ||
                                   queryLower.Contains("math") || queryLower.Contains("equation");

        var enableThinking = request.EnableThinking ?? settings.Gemini.Features.EnableThinking;

        // Check if code execution should be enabled
        var enableCodeExecution = request.EnableCodeExecution ||
                                  (mightNeedCalculation && settings.Gemini.Features.EnableCodeExecution) ||
                                  (request.FileReferences?.Count > 0); // Enable when files are provided

        // Auto-enable grounding when query needs real-time info, or when explicitly enabled in settings
        var enableGrounding = mightNeedRealTimeInfo || settings.Gemini.Features.EnableGrounding;

        // IMPORTANT: Gemini doesn't support grounding + function calling together
        // When grounding is enabled, we must disable function declarations
        var featureOptions = new GeminiFeatureOptions
        {
            FunctionDeclarations = enableGrounding ? null : (functionDeclarations.Count > 0 ? functionDeclarations : null),
            EnableGrounding = enableGrounding,
            EnableCodeExecution = enableCodeExecution,
            EnableThinking = enableThinking,
            ThinkingBudget = enableThinking ? (request.ThinkingBudget ?? settings.Gemini.Thinking.DefaultBudget) : null,
            FileReferences = request.FileReferences
        };

        if (featureOptions.EnableGrounding)
        {
            _logger.LogInformation("Enabling Google Search grounding for this query (function calling disabled - not supported together)");
        }
        if (featureOptions.EnableCodeExecution)
            _logger.LogInformation("Enabling code execution for this query");
        if (featureOptions.EnableThinking)
            _logger.LogInformation("Enabling Gemini thinking mode with budget: {Budget}", featureOptions.ThinkingBudget);
        if (featureOptions.FileReferences?.Count > 0)
            _logger.LogInformation("Including {Count} file references for analysis", featureOptions.FileReferences.Count);

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            yield return StatusEvent(iteration == 0 ? "Analyzing your request..." : "Continuing with tool results...");

            var pendingFunctionCalls = new List<Services.AI.Models.FunctionCallInfo>();
            var iterationText = new StringBuilder();

            await foreach (var evt in _geminiProvider.StreamWithFeaturesAsync(
                messages, aiSettings, featureOptions, cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                switch (evt.Type)
                {
                    case GeminiStreamEventType.Text:
                        if (!string.IsNullOrEmpty(evt.Text))
                        {
                            iterationText.Append(evt.Text);
                            yield return TokenEvent(evt.Text);
                        }
                        break;

                    case GeminiStreamEventType.Thinking:
                        if (!string.IsNullOrEmpty(evt.Text) && !emittedThinkingBlocks.Contains(evt.Text))
                        {
                            emittedThinkingBlocks.Add(evt.Text);
                            yield return ThinkingEvent(evt.Text);
                        }
                        break;

                    case GeminiStreamEventType.FunctionCalls:
                        if (evt.FunctionCalls != null)
                            pendingFunctionCalls.AddRange(evt.FunctionCalls);
                        break;

                    case GeminiStreamEventType.GroundingSources:
                        if (evt.GroundingSources != null && evt.GroundingSources.Count > 0)
                        {
                            // Track grounding usage for cost monitoring ($14/1k grounding queries)
                            groundingSourceCount += evt.GroundingSources.Count;
                            _logger.LogDebug("Gemini grounding returned {Count} sources (total: {Total})",
                                evt.GroundingSources.Count, groundingSourceCount);

                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.Grounding,
                                GroundingSources = evt.GroundingSources
                            };
                        }
                        break;

                    case GeminiStreamEventType.Complete:
                        // Capture actual token usage from UsageMetadata
                        if (evt.InputTokens.HasValue)
                            totalInputTokens = (totalInputTokens ?? 0) + evt.InputTokens.Value;
                        if (evt.OutputTokens.HasValue)
                            totalOutputTokens = (totalOutputTokens ?? 0) + evt.OutputTokens.Value;
                        if (evt.CachedTokens.HasValue)
                            cachedTokens = (cachedTokens ?? 0) + evt.CachedTokens.Value;
                        break;

                    case GeminiStreamEventType.CodeExecution:
                        if (evt.CodeExecutionResult != null)
                        {
                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.CodeExecution,
                                CodeExecutionResult = evt.CodeExecutionResult
                            };
                        }
                        break;

                    case GeminiStreamEventType.Error:
                        yield return ErrorEvent($"Error from Gemini: {evt.Error}");
                        yield break;
                }
            }

            fullResponse.Append(iterationText);

            // Process function calls
            if (pendingFunctionCalls.Count > 0)
            {
                yield return StatusEvent($"Executing {pendingFunctionCalls.Count} tool(s)...");

                // Emit start events
                var geminiToolIds = new Dictionary<string, string>();
                foreach (var call in pendingFunctionCalls)
                {
                    var geminiToolId = $"toolu_{ToolExecutor.GenerateToolId(call.Name, call.Arguments)}";
                    geminiToolIds[call.Name] = geminiToolId;
                    yield return ToolCallStartEvent(call.Name, geminiToolId, call.Arguments);
                }

                // Execute tools
                var toolCalls = pendingFunctionCalls.Select(c => new PendingToolCall(
                    geminiToolIds[c.Name],
                    c.Name,
                    c.Arguments,
                    JsonNode.Parse(c.Arguments)
                )).ToList();

                var results = await ToolExecutor.ExecuteMultipleAsync(
                    toolCalls,
                    pluginMethods,
                    settings.Gemini.FunctionCalling.ParallelExecution,
                    cancellationToken);

                // Emit end events
                foreach (var result in results)
                {
                    yield return ToolCallEndEvent(result.Name, result.Id, result.Result);
                }

                // Add messages to history
                var assistantMsg = new Services.AI.Models.ChatMessage
                {
                    Role = "assistant",
                    Content = iterationText.ToString(),
                    ToolCalls = pendingFunctionCalls
                };
                messages.Add(assistantMsg);

                // Send function results back to Gemini
                var functionResults = results.Select(r => (r.Name, (object)r.Result)).ToArray();
                var response = await _geminiProvider.ContinueWithFunctionResultsAsync(
                    messages, functionResults, aiSettings, featureOptions, cancellationToken);

                var toolMsg = new Services.AI.Models.ChatMessage
                {
                    Role = "tool",
                    ToolResults = results.Select(r => new Services.AI.Models.FunctionResultInfo
                    {
                        Name = r.Name,
                        Result = r.Result
                    }).ToList()
                };
                messages.Add(toolMsg);

                if (!response.Success)
                {
                    yield return ErrorEvent($"Error continuing with function results: {response.Error}");
                    yield break;
                }

                if (response.FunctionCalls != null && response.FunctionCalls.Count > 0)
                {
                    if (!string.IsNullOrEmpty(response.Content))
                    {
                        fullResponse.Append(response.Content);
                        yield return TokenEvent(response.Content);
                    }
                    continue;
                }

                if (!string.IsNullOrEmpty(response.Content))
                {
                    fullResponse.Append(response.Content);
                    yield return TokenEvent(response.Content);
                }
                break;
            }
            else
            {
                break;
            }
        }

        // Log grounding usage for cost monitoring
        if (groundingSourceCount > 0)
        {
            _logger.LogInformation(
                "Gemini grounding used {Count} total sources (approx cost: ${Cost:F4})",
                groundingSourceCount, groundingSourceCount * 0.014); // $14/1k queries
        }

        // Log actual token usage from UsageMetadata
        if (totalInputTokens.HasValue || totalOutputTokens.HasValue)
        {
            _logger.LogInformation(
                "Gemini token usage - Input: {Input}, Output: {Output}, Cached: {Cached}, Total: {Total}",
                totalInputTokens ?? 0,
                totalOutputTokens ?? 0,
                cachedTokens ?? 0,
                (totalInputTokens ?? 0) + (totalOutputTokens ?? 0));
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cachedTokens: cachedTokens);
    }
}
