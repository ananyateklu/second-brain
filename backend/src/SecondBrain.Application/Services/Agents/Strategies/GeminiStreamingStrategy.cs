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
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<GeminiStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
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
            request.AgentRagEnabled,
            request.Provider,
            request.Model,
            request.RagOptions,
            request.ContextImages);

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

        var lastUserMessage = GetLastUserMessage(request);

        var fullResponse = new StringBuilder();
        // Use context.EmittedThinkingBlocks to persist across tool execution iterations
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
                        // Use shared context for deduplication across tool execution iterations
                        if (!string.IsNullOrEmpty(evt.Text) &&
                            !Helpers.ThinkingExtractor.IsSimilarToEmitted(evt.Text, context.EmittedThinkingBlocks))
                        {
                            context.EmittedThinkingBlocks.Add(evt.Text);
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

                // Emit end events and handle AnalyzeImage specially
                // For AnalyzeImage: extract image data from marker, store cleaned result in history
                var toolResultImages = new List<(string MediaType, string Base64Data)>();
                var cleanedResults = new List<Helpers.ToolExecutionResult>();

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
                            AI.Models.MultimodalConfig.IsMultimodalModel("Gemini", request.Model))
                        {
                            toolResultImages.Add((mediaType ?? "image/png", base64Data));
                            _logger.LogInformation("Extracted image for AnalyzeImage (ephemeral, not stored in history) for model {Model}", request.Model);
                        }
                    }

                    yield return ToolCallEndEvent(result.Name, result.Id, resultForStorage);
                    cleanedResults.Add(new Helpers.ToolExecutionResult(result.Id, result.Name, result.Arguments, resultForStorage, result.Success));
                }

                // Add messages to history
                var assistantMsg = new Services.AI.Models.ChatMessage
                {
                    Role = "assistant",
                    Content = iterationText.ToString(),
                    ToolCalls = pendingFunctionCalls
                };
                messages.Add(assistantMsg);

                // Send function results back to Gemini (use cleaned results, no base64)
                var functionResults = cleanedResults.Select(r => (FunctionName: r.Name, Result: (object)r.Result)).ToArray();
                var response = await _geminiProvider.ContinueWithFunctionResultsAsync(
                    messages, functionResults, aiSettings, featureOptions, cancellationToken);

                // If AnalyzeImage returned an image, add it as a follow-up user message
                if (toolResultImages.Count > 0)
                {
                    var imageUserMsg = new Services.AI.Models.ChatMessage
                    {
                        Role = "user",
                        Content = "Here is the image from the AnalyzeImage tool. Please analyze it and describe what you see:",
                        Images = toolResultImages.Select(img => new Services.AI.Models.MessageImage
                        {
                            MediaType = img.MediaType,
                            Base64Data = img.Base64Data
                        }).ToList()
                    };
                    messages.Add(imageUserMsg);
                    _logger.LogInformation("Added image from AnalyzeImage tool for Gemini model {Model}", request.Model);
                }

                var toolMsg = new Services.AI.Models.ChatMessage
                {
                    Role = "tool",
                    ToolResults = cleanedResults.Select(r => new Services.AI.Models.FunctionResultInfo
                    {
                        Name = r.Name,
                        Result = r.Result  // Cleaned result (no base64)
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
