using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json.Nodes;
using Anthropic.SDK;
using Anthropic.SDK.Common;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Native Anthropic/Claude tool calling implementation.
/// Uses Claude's native tool_use/tool_result format for reliable function calling.
/// </summary>
public class AnthropicStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly ILogger<AnthropicStreamingStrategy> _logger;

    public AnthropicStreamingStrategy(
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        ILogger<AnthropicStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "claude", "anthropic" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        var isAnthropic = SupportedProviders.Any(p =>
            request.Provider.Equals(p, StringComparison.OrdinalIgnoreCase));

        return isAnthropic &&
               settings.Anthropic.Enabled &&
               !string.IsNullOrEmpty(settings.Anthropic.ApiKey);
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var settings = context.Settings;

        if (!settings.Anthropic.Enabled || string.IsNullOrEmpty(settings.Anthropic.ApiKey))
        {
            yield return ErrorEvent("Anthropic/Claude provider is not enabled or configured");
            yield break;
        }

        var client = new AnthropicClient(settings.Anthropic.ApiKey);
        var request = context.Request;

        // Build tools from enabled plugins
        Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> pluginMethods;
        List<Anthropic.SDK.Common.Tool> tools;

        if (request.Capabilities != null && request.Capabilities.Count > 0)
        {
            yield return StatusEvent("Preparing tools...");
            (tools, pluginMethods) = ToolBuilder.BuildAnthropicTools(
                request.Capabilities,
                context.Plugins,
                request.UserId,
                request.AgentRagEnabled,
                request.Provider,
                request.Model,
                request.RagOptions);
        }
        else
        {
            tools = new List<Anthropic.SDK.Common.Tool>();
            pluginMethods = new Dictionary<string, (IAgentPlugin, MethodInfo)>();
        }

        // Check if web search should be enabled
        var enableWebSearch = settings.Anthropic.Features.EnableWebSearch;
        var lastUserMessage = GetLastUserMessage(request)?.ToLowerInvariant() ?? "";

        // Auto-enable web search for queries that likely need real-time information
        if (!enableWebSearch && ShouldAutoEnableWebSearch(lastUserMessage))
        {
            enableWebSearch = true;
            _logger.LogDebug("Auto-enabling web search for query that may need real-time info");
        }

        // Track web search sources collected during this session
        var webSearchSources = new List<ClaudeSearchSource>();

        // Add web search tool if enabled
        if (enableWebSearch)
        {
            _logger.LogInformation("Enabling Claude web search (cost: $10/1000 searches)");
            yield return StatusEvent("Enabling web search...");

            var webSearchConfig = settings.Anthropic.WebSearch;

            // Build user location if configured
            UserLocation? userLocation = null;
            if (webSearchConfig.IncludeUserLocation && webSearchConfig.DefaultUserLocation != null)
            {
                userLocation = new UserLocation
                {
                    City = webSearchConfig.DefaultUserLocation.City,
                    Region = webSearchConfig.DefaultUserLocation.Region,
                    Country = webSearchConfig.DefaultUserLocation.Country,
                    Timezone = webSearchConfig.DefaultUserLocation.Timezone
                };
            }

            // Add web search tool using SDK's ServerTools helper
            // Parameters: maxUses, allowedDomains, blockedDomains, userLocation
            var webSearchTool = ServerTools.GetWebSearchTool(
                webSearchConfig.MaxUses,
                webSearchConfig.AllowedDomains.Count > 0 ? webSearchConfig.AllowedDomains : null,
                webSearchConfig.BlockedDomains.Count > 0 ? webSearchConfig.BlockedDomains : null,
                userLocation
            );

            tools.Add(webSearchTool);
        }

        yield return StatusEvent("Building conversation context...");

        // Build message history
        var messages = BuildAnthropicMessages(request);

        var systemPrompt = context.GetSystemPrompt(request.Capabilities);

        var fullResponse = new StringBuilder();
        // Use context.EmittedThinkingBlocks to persist across tool execution iterations
        var maxIterations = 10;
        var toolsExecutedThisSession = false;
        string? lastToolResultSummary = null;

        // Token tracking
        int totalInputTokens = 0;
        int totalOutputTokens = 0;
        int totalCacheCreationTokens = 0;
        int totalCacheReadTokens = 0;

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            yield return StatusEvent(iteration == 0 ? "Analyzing your request..." : "Continuing with tool results...");

            var parameters = new MessageParameters
            {
                Model = request.Model,
                Messages = messages,
                MaxTokens = request.MaxTokens ?? 4096,
                System = new List<SystemMessage> { new(systemPrompt) },
                Temperature = request.Temperature.HasValue ? (decimal)request.Temperature.Value : 0.7m,
                Stream = true
            };

            // Prompt caching
            if (settings.Anthropic.Caching.Enabled &&
                systemPrompt.Length >= settings.Anthropic.Caching.MinContentTokens * 4)
            {
                parameters.PromptCaching = PromptCacheType.AutomaticToolsAndSystem;
            }

            if (tools.Count > 0)
            {
                parameters.Tools = tools;
            }

            // Extended thinking support
            var enableThinking = request.EnableThinking ?? settings.Anthropic.Features.EnableExtendedThinking;
            if (enableThinking && ThinkingExtractor.SupportsNativeThinking("anthropic", request.Model))
            {
                var thinkingBudget = request.ThinkingBudget ?? settings.Anthropic.Thinking.DefaultBudget;
                thinkingBudget = Math.Min(thinkingBudget, settings.Anthropic.Thinking.MaxBudget);

                parameters.Thinking = new ThinkingParameters
                {
                    BudgetTokens = thinkingBudget
                };
            }

            var pendingToolCalls = new List<(string Id, string Name, JsonNode? Input)>();
            var responseContentBlocks = new List<ContentBase>();
            var iterationTextContent = new StringBuilder();
            string? errorMessage = null;
            var hasToolUse = false;
            var hasEmittedFirstToken = false;
            var streamOutputs = new List<MessageResponse>();

            // Track thinking blocks for tool use (required by Anthropic API)
            var currentThinkingContent = new StringBuilder();
            string? currentThinkingSignature = null;
            var isInThinkingBlock = false;

            // Stream the response
            await foreach (var streamEvent in StreamAnthropicWithErrorHandling(
                client, parameters, cancellationToken, e => errorMessage = e))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                streamOutputs.Add(streamEvent);

                // Track token usage from message_start/message_delta events
                if (streamEvent.Usage != null)
                {
                    if (streamEvent.Usage.InputTokens > 0)
                        totalInputTokens += streamEvent.Usage.InputTokens;
                    if (streamEvent.Usage.OutputTokens > 0)
                        totalOutputTokens += streamEvent.Usage.OutputTokens;
                    if (streamEvent.Usage.CacheCreationInputTokens > 0)
                        totalCacheCreationTokens += streamEvent.Usage.CacheCreationInputTokens;
                    if (streamEvent.Usage.CacheReadInputTokens > 0)
                        totalCacheReadTokens += streamEvent.Usage.CacheReadInputTokens;
                }

                // Detect thinking block start
                if (streamEvent.ContentBlock?.Type == "thinking")
                {
                    isInThinkingBlock = true;
                    currentThinkingContent.Clear();
                    currentThinkingSignature = null;
                    continue;
                }

                // Detect tool_use content blocks
                if (streamEvent.ContentBlock?.Type == "tool_use")
                {
                    // If we were in a thinking block, finalize it before tool use
                    if (isInThinkingBlock && currentThinkingContent.Length > 0)
                    {
                        isInThinkingBlock = false;
                        // Add thinking block to response content for tool use preservation
                        responseContentBlocks.Add(new ThinkingContent
                        {
                            Thinking = currentThinkingContent.ToString(),
                            Signature = currentThinkingSignature ?? ""
                        });
                    }
                    hasToolUse = true;
                    yield return StatusEvent($"Planning to use {streamEvent.ContentBlock.Name}...");
                    continue;
                }

                // Handle server_tool_use (web search being executed by Anthropic)
                if (streamEvent.ContentBlock?.Type == "server_tool_use")
                {
                    var toolName = streamEvent.ContentBlock.Name;
                    if (toolName == "web_search")
                    {
                        yield return StatusEvent("Searching the web...");
                        _logger.LogDebug("Claude is executing web search");
                    }
                    continue;
                }

                // Handle web_search_tool_result (search results from Anthropic)
                if (streamEvent.ContentBlock?.Type == "web_search_tool_result")
                {
                    // Extract search sources from the result
                    var sources = ExtractWebSearchSources(streamEvent);
                    if (sources.Count > 0)
                    {
                        webSearchSources.AddRange(sources);
                        _logger.LogInformation("Claude web search returned {Count} sources", sources.Count);

                        // Emit search sources event to frontend
                        yield return ClaudeSearchEvent(sources, null);
                    }
                    continue;
                }

                // Handle thinking signature delta (comes just before content_block_stop)
                if (streamEvent.Delta?.Signature != null)
                {
                    currentThinkingSignature = streamEvent.Delta.Signature;
                    continue;
                }

                // Handle native thinking content delta
                if (streamEvent.Delta?.Thinking != null)
                {
                    currentThinkingContent.Append(streamEvent.Delta.Thinking);
                    // Deduplicate using shared context to prevent duplicates across iterations
                    var thinkingDelta = streamEvent.Delta.Thinking;
                    if (!Helpers.ThinkingExtractor.IsSimilarToEmitted(thinkingDelta, context.EmittedThinkingBlocks))
                    {
                        context.EmittedThinkingBlocks.Add(thinkingDelta);
                        yield return ThinkingEvent(thinkingDelta);
                    }
                    continue;
                }

                // Handle text block start (may signal end of thinking block)
                if (streamEvent.ContentBlock?.Type == "text" && isInThinkingBlock)
                {
                    isInThinkingBlock = false;
                    // Add thinking block to response content for tool use preservation
                    if (currentThinkingContent.Length > 0)
                    {
                        responseContentBlocks.Add(new ThinkingContent
                        {
                            Thinking = currentThinkingContent.ToString(),
                            Signature = currentThinkingSignature ?? ""
                        });
                    }
                }

                // Handle text deltas
                if (streamEvent.Delta?.Text != null)
                {
                    var text = streamEvent.Delta.Text;
                    fullResponse.Append(text);
                    iterationTextContent.Append(text);

                    if (!hasEmittedFirstToken)
                    {
                        hasEmittedFirstToken = true;
                        yield return StatusEvent("Generating response...");
                    }

                    // Check for XML-style thinking blocks (fallback)
                    if (!enableThinking || !ThinkingExtractor.SupportsNativeThinking("anthropic", request.Model))
                    {
                        foreach (var thinkingContent in ThinkingExtractor.ExtractXmlThinkingBlocks(
                            fullResponse.ToString(), context.EmittedThinkingBlocks))
                        {
                            yield return ThinkingEvent(thinkingContent);
                        }
                    }

                    yield return TokenEvent(text);
                }
            }

            if (errorMessage != null)
            {
                yield return ErrorEvent($"Error: {errorMessage}");
                yield break;
            }

            // Extract tool calls from stream outputs
            if (hasToolUse && streamOutputs.Count > 0)
            {
                ExtractToolCallsFromStream(streamOutputs, pendingToolCalls, responseContentBlocks);
            }

            // Execute pending tool calls
            if (pendingToolCalls.Count > 0)
            {
                var textContent = iterationTextContent.ToString();

                yield return StatusEvent($"Executing {pendingToolCalls.Count} tool{(pendingToolCalls.Count > 1 ? "s" : "")}...");

                // Add assistant message with tool use to history
                // IMPORTANT: Include the text content BEFORE tool use so Claude remembers what it said
                // This fixes the context loss bug where text streamed before tool execution was forgotten
                // NOTE: Anthropic requires thinking blocks to be FIRST in the content array
                if (!string.IsNullOrEmpty(textContent))
                {
                    // Find the insertion point: after any ThinkingContent, before ToolUseContent
                    var insertIndex = 0;
                    for (int i = 0; i < responseContentBlocks.Count; i++)
                    {
                        if (responseContentBlocks[i] is ThinkingContent)
                        {
                            insertIndex = i + 1; // Insert after thinking blocks
                        }
                        else
                        {
                            break; // Stop at first non-thinking block
                        }
                    }
                    responseContentBlocks.Insert(insertIndex, new TextContent { Text = textContent });
                }

                messages.Add(new Message
                {
                    Role = RoleType.Assistant,
                    Content = responseContentBlocks
                });

                // Execute tools and collect results
                var toolResults = new List<ContentBase>();

                foreach (var (toolId, toolName, toolInput) in pendingToolCalls)
                {
                    var effectiveInput = toolInput;

                    // WORKAROUND: For CreateNote, if content is missing but there's text output, use that
                    if (toolName == "CreateNote" && toolInput is JsonObject inputObj)
                    {
                        var hasContent = inputObj.ContainsKey("content") &&
                                        inputObj["content"] != null &&
                                        !string.IsNullOrWhiteSpace(inputObj["content"]?.GetValue<string>());

                        if (!hasContent && !string.IsNullOrWhiteSpace(textContent))
                        {
                            var cleanedContent = CleanContentForNote(textContent);
                            if (!string.IsNullOrWhiteSpace(cleanedContent))
                            {
                                var newInput = new JsonObject();
                                foreach (var kvp in inputObj)
                                {
                                    newInput[kvp.Key] = kvp.Value?.DeepClone();
                                }
                                newInput["content"] = cleanedContent;
                                effectiveInput = newInput;
                            }
                        }
                    }

                    yield return StatusEvent($"Executing {toolName}...");
                    yield return ToolCallStartEvent(toolName, toolId, effectiveInput?.ToJsonString() ?? "{}");

                    Helpers.ToolExecutionResult execResult;
                    if (pluginMethods.TryGetValue(toolName, out var pluginMethod))
                    {
                        var toolCall = new PendingToolCall(toolId, toolName, effectiveInput?.ToJsonString() ?? "{}", effectiveInput);
                        execResult = await ToolExecutor.ExecuteAsync(
                            toolCall, pluginMethod.Plugin, pluginMethod.Method, cancellationToken);
                    }
                    else
                    {
                        execResult = new Helpers.ToolExecutionResult(toolId, toolName, effectiveInput?.ToJsonString() ?? "{}", $"Error: Unknown tool '{toolName}'", Success: false);
                    }

                    // Handle AnalyzeImage tool - extract image data from marker, strip before storing
                    // Format: __IMAGE_DATA__mediaType|base64Data__END_IMAGE_DATA__<json>
                    var resultForStorage = execResult.Result;
                    string? extractedBase64 = null;
                    string? extractedMediaType = null;

                    if (toolName.Equals("AnalyzeImage", StringComparison.OrdinalIgnoreCase))
                    {
                        var (cleanedResult, mediaType, base64Data) = ExtractImageDataFromResult(execResult.Result);
                        resultForStorage = cleanedResult;
                        extractedBase64 = base64Data;
                        extractedMediaType = mediaType;
                    }

                    yield return ToolCallEndEvent(toolName, toolId, resultForStorage);

                    // Build tool result content blocks - use cleaned result for storage (no base64)
                    var contentBlocks = new List<ContentBase> { new TextContent { Text = resultForStorage } };

                    // If we extracted image data and model supports vision, inject image for THIS request only
                    // The image is NOT stored in conversation history (resultForStorage has no base64)
                    if (extractedBase64 != null &&
                        AI.Models.MultimodalConfig.IsMultimodalModel("Claude", request.Model))
                    {
                        contentBlocks.Add(new ImageContent
                        {
                            Source = new ImageSource
                            {
                                MediaType = extractedMediaType ?? "image/png",
                                Data = extractedBase64
                            }
                        });
                        _logger.LogInformation("Injected image for AnalyzeImage (ephemeral, not stored in history) for model {Model}", request.Model);
                    }

                    toolResults.Add(new ToolResultContent
                    {
                        ToolUseId = toolId,
                        Content = contentBlocks
                    });

                    // Track that tools were executed and capture result for potential fallback
                    toolsExecutedThisSession = true;
                    lastToolResultSummary = execResult.Result;
                }

                // Add tool results as user message
                messages.Add(new Message
                {
                    Role = RoleType.User,
                    Content = toolResults
                });

                continue; // Next iteration
            }

            break; // No more tool calls
        }

        // Handle case where tools were executed but no text response was generated
        // This can happen with extended thinking where Claude puts reasoning in thinking blocks only
        if (toolsExecutedThisSession && string.IsNullOrWhiteSpace(fullResponse.ToString()))
        {
            _logger.LogWarning("Tools were executed but no text response was generated. Attempting follow-up request.");

            // Add a follow-up message prompting Claude to summarize the tool results
            messages.Add(new Message(RoleType.User,
                "Please provide a brief, helpful response summarizing the tool results for the user."));

            var followUpParameters = new MessageParameters
            {
                Model = request.Model,
                Messages = messages,
                MaxTokens = request.MaxTokens ?? 1024,
                System = new List<SystemMessage> { new(systemPrompt) },
                Temperature = request.Temperature.HasValue ? (decimal)request.Temperature.Value : 0.7m,
                Stream = true
            };

            // Don't include tools in the follow-up to encourage text response
            // Also disable extended thinking to ensure we get text output
            await foreach (var streamEvent in StreamAnthropicWithErrorHandling(
                client, followUpParameters, cancellationToken, e => _logger.LogError("Follow-up error: {Error}", e)))
            {
                if (cancellationToken.IsCancellationRequested)
                    yield break;

                if (streamEvent.Delta?.Text != null)
                {
                    fullResponse.Append(streamEvent.Delta.Text);
                    yield return TokenEvent(streamEvent.Delta.Text);
                }

                // Track token usage from follow-up
                if (streamEvent.Usage != null)
                {
                    if (streamEvent.Usage.InputTokens > 0)
                        totalInputTokens += streamEvent.Usage.InputTokens;
                    if (streamEvent.Usage.OutputTokens > 0)
                        totalOutputTokens += streamEvent.Usage.OutputTokens;
                }
            }
        }

        // Log final token usage
        if (totalInputTokens > 0 || totalOutputTokens > 0)
        {
            _logger.LogInformation(
                "Anthropic token usage - Input: {Input}, Output: {Output}, CacheCreation: {CacheCreation}, CacheRead: {CacheRead}",
                totalInputTokens, totalOutputTokens, totalCacheCreationTokens, totalCacheReadTokens);
        }

        yield return EndEventWithTokens(
            fullResponse.ToString(),
            inputTokens: totalInputTokens > 0 ? totalInputTokens : null,
            outputTokens: totalOutputTokens > 0 ? totalOutputTokens : null,
            cachedTokens: totalCacheReadTokens > 0 ? totalCacheReadTokens : null);
    }

    private List<Message> BuildAnthropicMessages(AgentRequest request)
    {
        var messages = new List<Message>();
        List<ContentBase>? pendingToolResults = null;

        for (int i = 0; i < request.Messages.Count; i++)
        {
            var msg = request.Messages[i];

            if (msg.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            {
                if (pendingToolResults != null && pendingToolResults.Count > 0)
                {
                    var combinedContent = new List<ContentBase>(pendingToolResults)
                    {
                        new TextContent { Text = msg.Content }
                    };
                    messages.Add(new Message
                    {
                        Role = RoleType.User,
                        Content = combinedContent
                    });
                    pendingToolResults = null;
                }
                else
                {
                    messages.Add(new Message(RoleType.User, msg.Content));
                }
            }
            else if (msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            {
                if (msg.ToolCalls != null && msg.ToolCalls.Any())
                {
                    var contentBlocks = new List<ContentBase>();
                    var content = msg.Content ?? string.Empty;
                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        contentBlocks.Add(new TextContent { Text = content });
                    }

                    var toolResultBlocks = new List<ContentBase>();
                    foreach (var tc in msg.ToolCalls)
                    {
                        var toolId = $"toolu_{ToolExecutor.GenerateToolId(tc.ToolName, tc.Arguments)}";

                        JsonNode? inputNode = null;
                        if (!string.IsNullOrEmpty(tc.Arguments))
                        {
                            try
                            {
                                inputNode = JsonNode.Parse(tc.Arguments);
                            }
                            catch
                            {
                                inputNode = new JsonObject { ["raw"] = tc.Arguments };
                            }
                        }

                        contentBlocks.Add(new ToolUseContent
                        {
                            Id = toolId,
                            Name = tc.ToolName,
                            Input = inputNode
                        });

                        toolResultBlocks.Add(new ToolResultContent
                        {
                            ToolUseId = toolId,
                            Content = new List<ContentBase> { new TextContent { Text = tc.Result } }
                        });
                    }

                    messages.Add(new Message
                    {
                        Role = RoleType.Assistant,
                        Content = contentBlocks
                    });

                    var nextMsg = i + 1 < request.Messages.Count ? request.Messages[i + 1] : null;
                    if (nextMsg != null && nextMsg.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
                    {
                        pendingToolResults = toolResultBlocks;
                    }
                    else
                    {
                        messages.Add(new Message
                        {
                            Role = RoleType.User,
                            Content = toolResultBlocks
                        });
                    }
                }
                else
                {
                    messages.Add(new Message(RoleType.Assistant, msg.Content ?? string.Empty));
                }
            }
        }

        if (pendingToolResults != null && pendingToolResults.Count > 0)
        {
            messages.Add(new Message
            {
                Role = RoleType.User,
                Content = pendingToolResults
            });
        }

        return messages;
    }

    private void ExtractToolCallsFromStream(
        List<MessageResponse> streamOutputs,
        List<(string Id, string Name, JsonNode? Input)> pendingToolCalls,
        List<ContentBase> responseContentBlocks)
    {
        string? currentToolId = null;
        string? currentToolName = null;
        var currentToolJson = new StringBuilder();

        foreach (var output in streamOutputs)
        {
            if (output.ContentBlock?.Type == "tool_use")
            {
                // Save previous tool if we have one
                if (currentToolId != null && currentToolName != null)
                {
                    SaveToolCall(currentToolId, currentToolName, currentToolJson.ToString(),
                        pendingToolCalls, responseContentBlocks);
                }

                currentToolId = output.ContentBlock.Id;
                currentToolName = output.ContentBlock.Name;
                currentToolJson.Clear();
            }
            else if (output.Delta?.PartialJson != null && currentToolId != null)
            {
                currentToolJson.Append(output.Delta.PartialJson);
            }
        }

        // Don't forget the last tool
        if (currentToolId != null && currentToolName != null)
        {
            SaveToolCall(currentToolId, currentToolName, currentToolJson.ToString(),
                pendingToolCalls, responseContentBlocks);
        }
    }

    private void SaveToolCall(
        string toolId,
        string toolName,
        string jsonStr,
        List<(string Id, string Name, JsonNode? Input)> pendingToolCalls,
        List<ContentBase> responseContentBlocks)
    {
        if (string.IsNullOrWhiteSpace(jsonStr))
            return;

        try
        {
            var inputNode = JsonNode.Parse(jsonStr);
            pendingToolCalls.Add((toolId, toolName, inputNode));
            responseContentBlocks.Add(new ToolUseContent
            {
                Id = toolId,
                Name = toolName,
                Input = inputNode
            });
            _logger.LogInformation("Tool call extracted from stream: {ToolName}, Id: {ToolId}", toolName, toolId);
        }
        catch (System.Text.Json.JsonException jsonEx)
        {
            _logger.LogWarning(jsonEx, "Failed to parse tool JSON for {ToolName}", toolName);
        }
    }

    private async IAsyncEnumerable<MessageResponse> StreamAnthropicWithErrorHandling(
        AnthropicClient client,
        MessageParameters parameters,
        [EnumeratorCancellation] CancellationToken cancellationToken,
        Action<string> onError)
    {
        IAsyncEnumerator<MessageResponse>? enumerator = null;

        try
        {
            enumerator = client.Messages.StreamClaudeMessageAsync(parameters, cancellationToken)
                .GetAsyncEnumerator(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting Anthropic streaming API");
            onError(ex.Message);
            yield break;
        }

        if (enumerator == null)
            yield break;

        try
        {
            while (true)
            {
                MessageResponse? current = null;
                bool hasNext = false;

                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                    if (hasNext)
                        current = enumerator.Current;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during Anthropic streaming");
                    onError(ex.Message);
                    yield break;
                }

                if (!hasNext)
                    break;

                if (current != null)
                    yield return current;
            }
        }
        finally
        {
            if (enumerator != null)
                await enumerator.DisposeAsync();
        }
    }

    /// <summary>
    /// Extract web search sources from a web_search_tool_result content block.
    /// </summary>
    private List<ClaudeSearchSource> ExtractWebSearchSources(MessageResponse streamEvent)
    {
        var sources = new List<ClaudeSearchSource>();

        try
        {
            // The Anthropic SDK returns WebSearchToolResultContent for web search results
            // Each result contains URL, title, and potentially page_age and snippet
            if (streamEvent.Content != null)
            {
                foreach (var content in streamEvent.Content)
                {
                    if (content is WebSearchToolResultContent webSearchResult)
                    {
                        foreach (var result in webSearchResult.Content.OfType<WebSearchResultContent>())
                        {
                            sources.Add(new ClaudeSearchSource
                            {
                                Url = result.Url ?? string.Empty,
                                Title = result.Title ?? string.Empty,
                                PageAge = result.PageAge,
                                // Snippet may come from encrypted_content in some cases
                            });
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract web search sources from response");
        }

        return sources;
    }

    /// <summary>
    /// Create an event for Claude web search sources.
    /// </summary>
    private static AgentStreamEvent ClaudeSearchEvent(List<ClaudeSearchSource> sources, string? searchQuery)
    {
        return new AgentStreamEvent
        {
            Type = AgentEventType.Grounding,
            Content = $"Found {sources.Count} web result(s)",
            ClaudeSearchSources = sources,
            SearchQuery = searchQuery
        };
    }

    /// <summary>
    /// Determine if web search should be auto-enabled based on the user's query.
    /// Looks for indicators that the query may need real-time information.
    /// </summary>
    private static bool ShouldAutoEnableWebSearch(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return false;

        // Keywords that indicate need for real-time information
        var realTimeIndicators = new[]
        {
            "latest", "current", "today", "recent", "news",
            "what is happening", "who won", "stock price",
            "weather", "score", "election", "announcement",
            "just released", "this week", "yesterday",
            "breaking", "update", "now", "live"
        };

        return realTimeIndicators.Any(indicator =>
            query.Contains(indicator, StringComparison.OrdinalIgnoreCase));
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
