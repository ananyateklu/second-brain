using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Anthropic.SDK.Common;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents;

/// <summary>
/// Filter to capture function invocation results for streaming
/// </summary>
internal class FunctionInvocationFilter : Microsoft.SemanticKernel.IFunctionInvocationFilter
{
    private readonly ConcurrentQueue<(string Name, string Arguments, string Result)> _results = new();

    public ConcurrentQueue<(string Name, string Arguments, string Result)> Results => _results;

    public async Task OnFunctionInvocationAsync(Microsoft.SemanticKernel.FunctionInvocationContext context, Func<Microsoft.SemanticKernel.FunctionInvocationContext, Task> next)
    {
        var functionName = context.Function.Name;
        var arguments = context.Arguments != null
            ? JsonSerializer.Serialize(context.Arguments.ToDictionary(kvp => kvp.Key, kvp => kvp.Value?.ToString()))
            : "";

        await next(context);

        var result = context.Result?.ToString() ?? "";
        _results.Enqueue((functionName, arguments, result));
    }
}

public class AgentService : IAgentService
{
    private readonly AIProvidersSettings _settings;
    private readonly RagSettings _ragSettings;
    private readonly INoteRepository _noteRepository;
    private readonly IRagService _ragService;
    private readonly ILogger<AgentService> _logger;
    private readonly Dictionary<string, IAgentPlugin> _plugins = new();
    private readonly QueryIntentDetector _intentDetector = new();

    public AgentService(
        IOptions<AIProvidersSettings> settings,
        IOptions<RagSettings> ragSettings,
        INoteRepository noteRepository,
        IRagService ragService,
        ILogger<AgentService> logger)
    {
        _settings = settings.Value;
        _ragSettings = ragSettings.Value;
        _noteRepository = noteRepository;
        _ragService = ragService;
        _logger = logger;

        // Register available plugins
        RegisterPlugin(new NotesPlugin(noteRepository, ragService, ragSettings.Value));
        // Future plugins can be registered here:
        // RegisterPlugin(new WebSearchPlugin(...));
        // RegisterPlugin(new CalendarPlugin(...));
    }

    private void RegisterPlugin(IAgentPlugin plugin)
    {
        _plugins[plugin.CapabilityId] = plugin;
    }

    public IReadOnlyList<AgentCapability> GetAvailableCapabilities()
    {
        return _plugins.Values.Select(p => new AgentCapability
        {
            Id = p.CapabilityId,
            DisplayName = p.DisplayName,
            Description = p.Description
        }).ToList().AsReadOnly();
    }

    public async IAsyncEnumerable<AgentStreamEvent> ProcessStreamAsync(
        AgentRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing agent request. Provider: {Provider}, Model: {Model}, UserId: {UserId}",
            request.Provider, request.Model, request.UserId);

        // Emit initial status
        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Status,
            Content = "Initializing agent..."
        };

        // Use native Claude tool calling for Anthropic provider
        var isAnthropic = request.Provider.Equals("claude", StringComparison.OrdinalIgnoreCase) ||
                         request.Provider.Equals("anthropic", StringComparison.OrdinalIgnoreCase);

        if (isAnthropic)
        {
            await foreach (var evt in ProcessAnthropicStreamAsync(request, cancellationToken))
            {
                yield return evt;
            }
            yield break;
        }

        // Emit status for preparing tools
        var hasCapabilities = request.Capabilities != null && request.Capabilities.Count > 0;
        if (hasCapabilities)
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Status,
                Content = "Preparing tools..."
            };
        }

        // Use Semantic Kernel for other providers
        Kernel? kernel = null;
        string? initError = null;

        try
        {
            kernel = BuildKernel(request.Provider, request.Model, request.UserId, request.Capabilities, request.AgentRagEnabled, request.OllamaBaseUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build kernel for provider {Provider}", request.Provider);
            initError = $"Failed to initialize agent: {ex.Message}";
        }

        if (initError != null)
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Error,
                Content = initError
            };
            yield break;
        }

        // Emit status for building context
        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Status,
            Content = "Building conversation context..."
        };

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(GetSystemPrompt(request.Capabilities));

        foreach (var message in request.Messages)
        {
            if (message.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            {
                chatHistory.AddUserMessage(message.Content);
            }
            else if (message.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            {
                // If this assistant message had tool calls, we need to include them in the history
                // This is critical for maintaining context across multi-turn conversations
                if (message.ToolCalls != null && message.ToolCalls.Any())
                {
                    // Build a comprehensive context message that includes both the response and tool execution details
                    var contextBuilder = new StringBuilder();

                    // Add the assistant's text response
                    if (!string.IsNullOrWhiteSpace(message.Content))
                    {
                        contextBuilder.AppendLine(message.Content);
                    }

                    // Add tool execution context as structured information
                    // Use a format that clearly marks this as system context, not something to reproduce
                    contextBuilder.AppendLine();
                    contextBuilder.AppendLine("---SYSTEM CONTEXT (DO NOT REPRODUCE THIS FORMAT IN YOUR RESPONSE)---");
                    contextBuilder.AppendLine("Tools executed in previous turn:");
                    foreach (var toolCall in message.ToolCalls)
                    {
                        contextBuilder.AppendLine($"  {toolCall.ToolName}: {toolCall.Result}");
                    }
                    contextBuilder.AppendLine("---END SYSTEM CONTEXT---");

                    chatHistory.AddAssistantMessage(contextBuilder.ToString());
                }
                else
                {
                    chatHistory.AddAssistantMessage(message.Content);
                }
            }
        }

        // Automatic context injection for knowledge queries (only when AgentRagEnabled is true)
        var lastUserMessage = GetLastUserMessage(request);
        if (request.AgentRagEnabled && !string.IsNullOrEmpty(lastUserMessage) && HasNotesCapability(request))
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Status,
                Content = "Searching your notes for relevant context..."
            };

            var (contextMessage, retrievedNotes, ragLogId) = await TryRetrieveContextAsync(
                lastUserMessage, request.UserId, HasNotesCapability(request), cancellationToken);

            if (contextMessage != null && retrievedNotes != null && retrievedNotes.Count > 0)
            {
                // Emit context retrieval event so frontend can display the retrieved notes
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.ContextRetrieval,
                    Content = $"Found {retrievedNotes.Count} relevant note(s)",
                    RetrievedNotes = retrievedNotes,
                    RagLogId = ragLogId?.ToString()
                };

                // Inject context as a system message (after the main system prompt but before user messages)
                chatHistory.AddSystemMessage(contextMessage);
            }
        }

        var chatService = kernel!.GetRequiredService<IChatCompletionService>();

        // Create and register the function invocation filter to capture tool results
        var functionFilter = new FunctionInvocationFilter();
        kernel.FunctionInvocationFilters.Add(functionFilter);

        // Create execution settings for OpenAI-compatible providers
        // Anthropic is handled separately via ProcessAnthropicStreamAsync
        var settings = new OpenAIPromptExecutionSettings
        {
            Temperature = request.Temperature ?? 0.7,
            MaxTokens = request.MaxTokens ?? 4096,
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
        };

        var fullResponse = new StringBuilder();
        var emittedToolCalls = new HashSet<string>(); // Track which tool calls we've already emitted
        var emittedThinkingBlocks = new HashSet<string>();
        var hasEmittedFirstToken = false;

        // Emit status for calling the model
        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Status,
            Content = $"Calling {request.Provider} model..."
        };

        await foreach (var update in chatService.GetStreamingChatMessageContentsAsync(
            chatHistory, settings, kernel, cancellationToken))
        {
            if (cancellationToken.IsCancellationRequested)
            {
                yield break;
            }

            // Emit "Generating response..." status on first content
            if (!hasEmittedFirstToken && !string.IsNullOrEmpty(update.Content))
            {
                hasEmittedFirstToken = true;
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Status,
                    Content = "Generating response..."
                };
            }

            // Check for completed function invocations from our filter
            while (functionFilter.Results.TryDequeue(out var toolResult))
            {
                var toolKey = $"{toolResult.Name}_{toolResult.Arguments}";
                if (!emittedToolCalls.Contains(toolKey))
                {
                    emittedToolCalls.Add(toolKey);

                    // Emit start event
                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.ToolCallStart,
                        ToolName = toolResult.Name,
                        ToolArguments = toolResult.Arguments
                    };

                    // Emit end event with result
                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.ToolCallEnd,
                        ToolName = toolResult.Name,
                        ToolResult = toolResult.Result
                    };
                }
            }

            if (!string.IsNullOrEmpty(update.Content))
            {
                fullResponse.Append(update.Content);

                // Check for thinking blocks in the accumulated response
                var currentContent = fullResponse.ToString();

                // Find and emit any complete thinking blocks
                var thinkingStartIndex = 0;
                while ((thinkingStartIndex = currentContent.IndexOf("<thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase)) != -1)
                {
                    var thinkingEndIndex = currentContent.IndexOf("</thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase);
                    if (thinkingEndIndex != -1)
                    {
                        var thinkingContent = currentContent.Substring(
                            thinkingStartIndex + 10,
                            thinkingEndIndex - thinkingStartIndex - 10
                        ).Trim();

                        if (!emittedThinkingBlocks.Contains(thinkingContent))
                        {
                            emittedThinkingBlocks.Add(thinkingContent);
                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.Thinking,
                                Content = thinkingContent
                            };
                        }
                        thinkingStartIndex = thinkingEndIndex + 11;
                    }
                    else
                    {
                        break;
                    }
                }

                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Token,
                    Content = update.Content
                };
            }
        }

        // Process any remaining tool results after streaming completes
        while (functionFilter.Results.TryDequeue(out var toolResult))
        {
            var toolKey = $"{toolResult.Name}_{toolResult.Arguments}";
            if (!emittedToolCalls.Contains(toolKey))
            {
                emittedToolCalls.Add(toolKey);

                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.ToolCallStart,
                    ToolName = toolResult.Name,
                    ToolArguments = toolResult.Arguments
                };

                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.ToolCallEnd,
                    ToolName = toolResult.Name,
                    ToolResult = toolResult.Result
                };
            }
        }

        yield return new AgentStreamEvent
        {
            Type = AgentEventType.End,
            Content = fullResponse.ToString()
        };
    }

    public async Task<AgentResponse> ProcessAsync(
        AgentRequest request,
        CancellationToken cancellationToken = default)
    {
        var response = new AgentResponse();
        var content = new StringBuilder();

        await foreach (var evt in ProcessStreamAsync(request, cancellationToken))
        {
            switch (evt.Type)
            {
                case AgentEventType.Token:
                    content.Append(evt.Content);
                    break;
                case AgentEventType.ToolCallEnd:
                    response.ToolCalls.Add(new ToolExecutionResult
                    {
                        ToolName = evt.ToolName ?? "",
                        Result = evt.ToolResult ?? ""
                    });
                    break;
                case AgentEventType.Error:
                    throw new Exception(evt.Content);
            }
        }

        response.Content = content.ToString();
        return response;
    }

    /// <summary>
    /// Native Anthropic tool calling implementation for Claude models
    /// </summary>
    private async IAsyncEnumerable<AgentStreamEvent> ProcessAnthropicStreamAsync(
        AgentRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!_settings.Anthropic.Enabled || string.IsNullOrEmpty(_settings.Anthropic.ApiKey))
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Error,
                Content = "Anthropic/Claude provider is not enabled or configured"
            };
            yield break;
        }

        var client = new AnthropicClient(_settings.Anthropic.ApiKey);

        // Build tools from enabled plugins
        var tools = new List<Anthropic.SDK.Common.Tool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Emit status for preparing tools if capabilities are enabled
        if (request.Capabilities != null && request.Capabilities.Count > 0)
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Status,
                Content = "Preparing tools..."
            };
            foreach (var capabilityId in request.Capabilities)
            {
                if (_plugins.TryGetValue(capabilityId, out var plugin))
                {
                    plugin.SetCurrentUserId(request.UserId);
                    plugin.SetAgentRagEnabled(request.AgentRagEnabled);

                    // Get all methods with KernelFunction attribute
                    var pluginInstance = plugin.GetPluginInstance();
                    var methods = pluginInstance.GetType().GetMethods()
                        .Where(m => m.GetCustomAttributes(typeof(Microsoft.SemanticKernel.KernelFunctionAttribute), false).Any());

                    foreach (var method in methods)
                    {
                        var funcAttr = method.GetCustomAttribute<Microsoft.SemanticKernel.KernelFunctionAttribute>();
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

                        // Create tool using Function class with parameters in constructor
                        var function = new Function(toolName, toolDescription, schemaObj);
                        tools.Add(new Anthropic.SDK.Common.Tool(function));
                        pluginMethods[toolName] = (plugin, method);

                        // Log the tool schema for debugging
                        _logger.LogDebug("Registered tool {ToolName} with schema: {Schema}",
                            toolName, schemaObj.ToJsonString());
                    }
                }
            }
        }

        // Emit status for building context
        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Status,
            Content = "Building conversation context..."
        };

        // Build message history
        var messages = new List<Anthropic.SDK.Messaging.Message>();

        foreach (var msg in request.Messages)
        {
            if (msg.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            {
                messages.Add(new Anthropic.SDK.Messaging.Message(RoleType.User, msg.Content));
            }
            else if (msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            {
                // Include tool call context if present
                if (msg.ToolCalls != null && msg.ToolCalls.Any())
                {
                    var contextBuilder = new StringBuilder();
                    if (!string.IsNullOrWhiteSpace(msg.Content))
                    {
                        contextBuilder.AppendLine(msg.Content);
                    }
                    contextBuilder.AppendLine();
                    contextBuilder.AppendLine("---SYSTEM CONTEXT (DO NOT REPRODUCE THIS FORMAT)---");
                    foreach (var tc in msg.ToolCalls)
                    {
                        contextBuilder.AppendLine($"  {tc.ToolName}: {tc.Result}");
                    }
                    contextBuilder.AppendLine("---END SYSTEM CONTEXT---");
                    messages.Add(new Anthropic.SDK.Messaging.Message(RoleType.Assistant, contextBuilder.ToString()));
                }
                else
                {
                    messages.Add(new Anthropic.SDK.Messaging.Message(RoleType.Assistant, msg.Content));
                }
            }
        }

        // Automatic context injection for knowledge queries (Anthropic path, only when AgentRagEnabled is true)
        string? injectedContext = null;
        var lastUserMessageAnthropic = GetLastUserMessage(request);
        if (request.AgentRagEnabled && !string.IsNullOrEmpty(lastUserMessageAnthropic) && HasNotesCapability(request))
        {
            yield return new AgentStreamEvent
            {
                Type = AgentEventType.Status,
                Content = "Searching your notes for relevant context..."
            };

            var (contextMessage, retrievedNotes, ragLogId) = await TryRetrieveContextAsync(
                lastUserMessageAnthropic, request.UserId, HasNotesCapability(request), cancellationToken);

            if (contextMessage != null && retrievedNotes != null && retrievedNotes.Count > 0)
            {
                // Emit context retrieval event so frontend can display the retrieved notes
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.ContextRetrieval,
                    Content = $"Found {retrievedNotes.Count} relevant note(s)",
                    RetrievedNotes = retrievedNotes,
                    RagLogId = ragLogId?.ToString()
                };

                injectedContext = contextMessage;
            }
        }

        var systemPrompt = GetSystemPrompt(request.Capabilities);
        // Append injected context to system prompt for Anthropic
        if (!string.IsNullOrEmpty(injectedContext))
        {
            systemPrompt += "\n\n" + injectedContext;
        }
        var fullResponse = new StringBuilder();
        var emittedThinkingBlocks = new HashSet<string>();
        var maxIterations = 10; // Prevent infinite loops

        for (int iteration = 0; iteration < maxIterations; iteration++)
        {
            // Emit status for calling the model
            if (iteration == 0)
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Status,
                    Content = "Analyzing your request..."
                };
            }
            else
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Status,
                    Content = "Continuing with tool results..."
                };
            }

            var parameters = new MessageParameters
            {
                Model = request.Model,
                Messages = messages,
                MaxTokens = request.MaxTokens ?? 4096,
                System = new List<SystemMessage> { new SystemMessage(systemPrompt) },
                Temperature = request.Temperature.HasValue ? (decimal)request.Temperature.Value : 0.7m,
                Stream = true // Enable streaming
            };

            if (tools.Count > 0)
            {
                parameters.Tools = tools;
            }

            var shouldContinue = false;
            string? errorMessage = null;

            // Track state
            var pendingToolCalls = new List<(string Id, string Name, JsonNode? Input)>();
            var responseContentBlocks = new List<ContentBase>();
            var iterationTextContent = new StringBuilder();

            // Use streaming for text delivery when no tools, non-streaming when tools are enabled
            // This ensures reliable tool call handling while still providing fast text streaming
            var useStreaming = tools.Count == 0;

            if (useStreaming)
            {
                // Stream text tokens in real-time (no tool handling needed)
                var hasEmittedFirstToken = false;

                await foreach (var streamEvent in StreamAnthropicWithErrorHandling(
                    client, parameters, cancellationToken, e => errorMessage = e))
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        yield break;
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
                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.Status,
                                Content = "Generating response..."
                            };
                        }

                        // Check for thinking blocks
                        var currentContent = fullResponse.ToString();
                        var thinkingStartIndex = 0;
                        while ((thinkingStartIndex = currentContent.IndexOf("<thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase)) != -1)
                        {
                            var thinkingEndIndex = currentContent.IndexOf("</thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase);
                            if (thinkingEndIndex != -1)
                            {
                                var thinkingContent = currentContent.Substring(
                                    thinkingStartIndex + 10,
                                    thinkingEndIndex - thinkingStartIndex - 10
                                ).Trim();

                                if (!emittedThinkingBlocks.Contains(thinkingContent))
                                {
                                    emittedThinkingBlocks.Add(thinkingContent);
                                    yield return new AgentStreamEvent
                                    {
                                        Type = AgentEventType.Thinking,
                                        Content = thinkingContent
                                    };
                                }
                                thinkingStartIndex = thinkingEndIndex + 11;
                            }
                            else break;
                        }

                        yield return new AgentStreamEvent
                        {
                            Type = AgentEventType.Token,
                            Content = text
                        };
                    }
                }
            }
            else
            {
                // Use non-streaming for tool-enabled requests (more reliable tool handling)
                // But emit progress status to keep user informed
                parameters.Stream = false;

                MessageResponse? response = null;
                try
                {
                    response = await client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calling Anthropic API");
                    errorMessage = ex.Message;
                }

                if (response?.Content != null)
                {
                    // Process response content
                    var hasTextContent = response.Content.Any(c => c is Anthropic.SDK.Messaging.TextContent tc && !string.IsNullOrEmpty(tc.Text));
                    if (hasTextContent)
                    {
                        yield return new AgentStreamEvent
                        {
                            Type = AgentEventType.Status,
                            Content = "Generating response..."
                        };
                    }

                    foreach (var content in response.Content)
                    {
                        if (content is Anthropic.SDK.Messaging.TextContent textContent)
                        {
                            var text = textContent.Text ?? "";
                            fullResponse.Append(text);
                            iterationTextContent.Append(text);

                            // Check for thinking blocks
                            var thinkingStartIndex = 0;
                            while ((thinkingStartIndex = text.IndexOf("<thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase)) != -1)
                            {
                                var thinkingEndIndex = text.IndexOf("</thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase);
                                if (thinkingEndIndex != -1)
                                {
                                    var thinkingContent = text.Substring(
                                        thinkingStartIndex + 10,
                                        thinkingEndIndex - thinkingStartIndex - 10
                                    ).Trim();

                                    if (!emittedThinkingBlocks.Contains(thinkingContent))
                                    {
                                        emittedThinkingBlocks.Add(thinkingContent);
                                        yield return new AgentStreamEvent
                                        {
                                            Type = AgentEventType.Thinking,
                                            Content = thinkingContent
                                        };
                                    }
                                    thinkingStartIndex = thinkingEndIndex + 11;
                                }
                                else break;
                            }

                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.Token,
                                Content = text
                            };

                            responseContentBlocks.Add(textContent);
                        }
                        else if (content is ToolUseContent toolUse)
                        {
                            _logger.LogInformation("Claude tool call received. Tool: {ToolName}, Id: {ToolId}, Arguments: {Arguments}",
                                toolUse.Name, toolUse.Id, toolUse.Input?.ToJsonString() ?? "null");

                            pendingToolCalls.Add((toolUse.Id ?? "", toolUse.Name ?? "", toolUse.Input));
                            responseContentBlocks.Add(toolUse);

                            yield return new AgentStreamEvent
                            {
                                Type = AgentEventType.Status,
                                Content = $"Planning to use {toolUse.Name}..."
                            };
                        }
                    }
                }
            }

            // Handle error outside of streaming loop
            if (errorMessage != null)
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Error,
                    Content = $"Error: {errorMessage}"
                };
                yield break;
            }

            // Execute any pending tool calls
            if (pendingToolCalls.Count > 0)
            {
                var textContent = iterationTextContent.ToString();

                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Status,
                    Content = $"Executing {pendingToolCalls.Count} tool{(pendingToolCalls.Count > 1 ? "s" : "")}..."
                };

                // Add assistant message with tool use to history
                if (responseContentBlocks.Count == 0)
                {
                    // If no content blocks, create one from text
                    if (!string.IsNullOrEmpty(textContent))
                    {
                        responseContentBlocks.Add(new Anthropic.SDK.Messaging.TextContent { Text = textContent });
                    }
                }

                var assistantMsg = new Anthropic.SDK.Messaging.Message
                {
                    Role = RoleType.Assistant,
                    Content = responseContentBlocks
                };
                messages.Add(assistantMsg);

                // Execute tools and collect results
                var toolResults = new List<ContentBase>();

                foreach (var (toolId, toolName, toolInput) in pendingToolCalls)
                {
                    // WORKAROUND: For CreateNote, if content is missing but there's text output, use that
                    var effectiveInput = toolInput;
                    if (toolName == "CreateNote" && toolInput is JsonObject inputObj)
                    {
                        var hasContent = inputObj.ContainsKey("content") &&
                                       inputObj["content"] != null &&
                                       !string.IsNullOrWhiteSpace(inputObj["content"]?.GetValue<string>());

                        if (!hasContent && !string.IsNullOrWhiteSpace(textContent))
                        {
                            _logger.LogWarning("CreateNote called without content parameter. Extracting content from Claude's text response (length: {Length})",
                                textContent.Length);

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

                                _logger.LogInformation("Injected content into CreateNote call from Claude's text response");
                            }
                        }
                    }

                    // Emit tool start event
                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.Status,
                        Content = $"Executing {toolName}..."
                    };

                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.ToolCallStart,
                        ToolName = toolName,
                        ToolArguments = effectiveInput?.ToJsonString() ?? "{}"
                    };

                    string result;
                    try
                    {
                        if (pluginMethods.TryGetValue(toolName, out var pluginMethod))
                        {
                            _logger.LogDebug("Executing tool {ToolName} via plugin {PluginName}",
                                toolName, pluginMethod.Plugin.GetPluginName());
                            result = await InvokePluginMethodAsync(
                                pluginMethod.Plugin,
                                pluginMethod.Method,
                                effectiveInput);
                            _logger.LogDebug("Tool {ToolName} execution result: {Result}", toolName, result);
                        }
                        else
                        {
                            result = $"Error: Unknown tool '{toolName}'";
                            _logger.LogWarning("Unknown tool requested: {ToolName}", toolName);
                        }
                    }
                    catch (Exception ex)
                    {
                        result = $"Error executing tool: {ex.Message}";
                        _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
                    }

                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.ToolCallEnd,
                        ToolName = toolName,
                        ToolResult = result
                    };

                    toolResults.Add(new ToolResultContent
                    {
                        ToolUseId = toolId,
                        Content = new List<ContentBase>
                        {
                            new Anthropic.SDK.Messaging.TextContent { Text = result }
                        }
                    });
                }

                // Add tool results as user message
                var userMsg = new Anthropic.SDK.Messaging.Message
                {
                    Role = RoleType.User,
                    Content = toolResults
                };
                messages.Add(userMsg);
                shouldContinue = true;
            }

            if (!shouldContinue)
            {
                break;
            }
        }

        yield return new AgentStreamEvent
        {
            Type = AgentEventType.End,
            Content = fullResponse.ToString()
        };
    }

    /// <summary>
    /// Helper to wrap Anthropic streaming API call with error handling.
    /// This allows us to avoid yield-in-try issues by wrapping the try-catch internally.
    /// </summary>
    private async IAsyncEnumerable<MessageResponse> StreamAnthropicWithErrorHandling(
        AnthropicClient client,
        MessageParameters parameters,
        [EnumeratorCancellation] CancellationToken cancellationToken,
        Action<string> onError)
    {
        IAsyncEnumerator<MessageResponse>? enumerator = null;

        try
        {
            enumerator = client.Messages.StreamClaudeMessageAsync(parameters, cancellationToken).GetAsyncEnumerator(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting Anthropic streaming API");
            onError(ex.Message);
            yield break;
        }

        if (enumerator == null)
        {
            yield break;
        }

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
                    {
                        current = enumerator.Current;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during Anthropic streaming");
                    onError(ex.Message);
                    yield break;
                }

                if (!hasNext)
                {
                    break;
                }

                if (current != null)
                {
                    yield return current;
                }
            }
        }
        finally
        {
            if (enumerator != null)
            {
                await enumerator.DisposeAsync();
            }
        }
    }

    internal static string GetJsonSchemaType(Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string)) return "string";
        if (underlyingType == typeof(int) || underlyingType == typeof(long)) return "integer";
        if (underlyingType == typeof(float) || underlyingType == typeof(double) || underlyingType == typeof(decimal)) return "number";
        if (underlyingType == typeof(bool)) return "boolean";
        if (underlyingType.IsArray || (underlyingType.IsGenericType && underlyingType.GetGenericTypeDefinition() == typeof(List<>))) return "array";

        return "string";
    }

    // Common parameter name aliases that AI models might use
    private static readonly Dictionary<string, string[]> ParameterAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        { "content", new[] { "body", "text", "note_content", "noteContent", "message" } },
        { "title", new[] { "name", "heading", "subject" } },
        { "query", new[] { "search", "searchQuery", "search_query", "q" } },
        { "tags", new[] { "labels", "categories", "tag" } },
        { "noteId", new[] { "note_id", "id", "noteID" } },
        { "contentToAppend", new[] { "content_to_append", "appendContent", "append_content", "newContent", "new_content" } }
    };

    internal async Task<string> InvokePluginMethodAsync(IAgentPlugin plugin, System.Reflection.MethodInfo method, JsonNode? input)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];

        // Log the raw input for debugging
        _logger.LogDebug("Invoking plugin method {MethodName} with input: {Input}",
            method.Name, input?.ToJsonString() ?? "null");

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramName = param.Name!;

            if (input is JsonObject jsonObj)
            {
                // First try the exact parameter name
                if (jsonObj.TryGetPropertyValue(paramName, out var value))
                {
                    args[i] = ConvertJsonToType(value, param.ParameterType);
                    _logger.LogDebug("Parameter {ParamName} found with value: {Value}",
                        paramName, value?.ToJsonString() ?? "null");
                }
                // Try fallback aliases if exact name not found
                else if (TryGetValueWithAliases(jsonObj, paramName, out var aliasValue, out var usedAlias))
                {
                    args[i] = ConvertJsonToType(aliasValue, param.ParameterType);
                    _logger.LogWarning("Parameter {ParamName} not found, but found alias {Alias} with value. Using alias value.",
                        paramName, usedAlias);
                }
                else if (param.HasDefaultValue)
                {
                    args[i] = param.DefaultValue;
                    _logger.LogDebug("Parameter {ParamName} not found, using default value", paramName);
                }
                else
                {
                    args[i] = null;
                    _logger.LogWarning("Required parameter {ParamName} not found in tool arguments and has no default. Available keys: {Keys}",
                        paramName, string.Join(", ", jsonObj.Select(kvp => kvp.Key)));
                }
            }
            else if (param.HasDefaultValue)
            {
                args[i] = param.DefaultValue;
            }
            else
            {
                args[i] = null;
                _logger.LogWarning("Input is not a JsonObject for method {MethodName}, parameter {ParamName} will be null",
                    method.Name, paramName);
            }
        }

        var result = method.Invoke(plugin.GetPluginInstance(), args);

        if (result is Task task)
        {
            await task;
            var resultProperty = task.GetType().GetProperty("Result");
            result = resultProperty?.GetValue(task);
        }

        return result?.ToString() ?? "";
    }

    /// <summary>
    /// Tries to get a value from the JSON object using parameter aliases
    /// </summary>
    private static bool TryGetValueWithAliases(JsonObject jsonObj, string paramName, out JsonNode? value, out string? usedAlias)
    {
        value = null;
        usedAlias = null;

        // Check if we have aliases for this parameter
        if (ParameterAliases.TryGetValue(paramName, out var aliases))
        {
            foreach (var alias in aliases)
            {
                if (jsonObj.TryGetPropertyValue(alias, out value) && value != null)
                {
                    usedAlias = alias;
                    return true;
                }
            }
        }

        // Also try case-insensitive matching as a last resort
        foreach (var kvp in jsonObj)
        {
            if (kvp.Key.Equals(paramName, StringComparison.OrdinalIgnoreCase) && kvp.Key != paramName)
            {
                value = kvp.Value;
                usedAlias = kvp.Key;
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Cleans up text content from Claude's response for use as note content.
    /// Removes thinking blocks, common conversational prefixes, and trims whitespace.
    /// </summary>
    private static string CleanContentForNote(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var content = text;

        // Remove thinking blocks (both <thinking> and <think> variants)
        content = System.Text.RegularExpressions.Regex.Replace(
            content,
            @"<think(?:ing)?>(.*?)</think(?:ing)?>",
            "",
            System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        // Remove common conversational prefixes that Claude might add
        var prefixesToRemove = new[]
        {
            @"^I'll create (?:a|the) note.*?(?:\.|:)\s*",
            @"^(?:Here's|Here is) the note.*?(?:\.|:)\s*",
            @"^Creating (?:a|the) note.*?(?:\.|:)\s*",
            @"^Let me create.*?(?:\.|:)\s*",
            @"^I'm creating.*?(?:\.|:)\s*",
        };

        foreach (var prefix in prefixesToRemove)
        {
            content = System.Text.RegularExpressions.Regex.Replace(
                content,
                prefix,
                "",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        }

        return content.Trim();
    }

    internal static object? ConvertJsonToType(JsonNode? node, Type targetType)
    {
        if (node == null) return null;

        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        try
        {
            if (underlyingType == typeof(string)) return node.GetValue<string>();
            if (underlyingType == typeof(int)) return node.GetValue<int>();
            if (underlyingType == typeof(long)) return node.GetValue<long>();
            if (underlyingType == typeof(float)) return node.GetValue<float>();
            if (underlyingType == typeof(double)) return node.GetValue<double>();
            if (underlyingType == typeof(bool)) return node.GetValue<bool>();

            return node.ToString();
        }
        catch
        {
            return node.ToString();
        }
    }

    internal Kernel BuildKernel(string provider, string model, string userId, List<string>? capabilities, bool agentRagEnabled = true, string? ollamaBaseUrl = null)
    {
        var builder = Kernel.CreateBuilder();

        switch (provider.ToLowerInvariant())
        {
            case "openai":
                if (!_settings.OpenAI.Enabled || string.IsNullOrEmpty(_settings.OpenAI.ApiKey))
                    throw new InvalidOperationException("OpenAI provider is not enabled or configured");

                builder.AddOpenAIChatCompletion(
                    modelId: model,
                    apiKey: _settings.OpenAI.ApiKey);
                break;

            case "grok":
            case "xai":
                if (!_settings.XAI.Enabled || string.IsNullOrEmpty(_settings.XAI.ApiKey))
                    throw new InvalidOperationException("xAI/Grok provider is not enabled or configured");

                // Grok uses OpenAI-compatible API
                builder.AddOpenAIChatCompletion(
                    modelId: model,
                    apiKey: _settings.XAI.ApiKey,
                    endpoint: new Uri(_settings.XAI.BaseUrl));
                break;

            case "claude":
            case "anthropic":
                // Claude/Anthropic is handled separately via ProcessAnthropicStreamAsync
                // This case should not be reached, but throw an error if it is
                throw new InvalidOperationException("Anthropic provider should be handled by ProcessAnthropicStreamAsync");

            case "gemini":
                if (!_settings.Gemini.Enabled || string.IsNullOrEmpty(_settings.Gemini.ApiKey))
                    throw new InvalidOperationException("Gemini provider is not enabled or configured");

                // Use Gemini's OpenAI-compatible endpoint
                builder.AddOpenAIChatCompletion(
                    modelId: model,
                    apiKey: _settings.Gemini.ApiKey,
                    endpoint: new Uri("https://generativelanguage.googleapis.com/v1beta/openai/"));
                break;

            case "ollama":
                if (!_settings.Ollama.Enabled)
                    throw new InvalidOperationException("Ollama provider is not enabled");

                // Use override URL if provided, otherwise use default from settings
                var effectiveOllamaUrl = !string.IsNullOrWhiteSpace(ollamaBaseUrl)
                    ? ollamaBaseUrl.TrimEnd('/')
                    : _settings.Ollama.BaseUrl;

                // Ollama can use OpenAI-compatible endpoint
                builder.AddOpenAIChatCompletion(
                    modelId: model,
                    apiKey: "ollama", // Ollama doesn't need a real key
                    endpoint: new Uri($"{effectiveOllamaUrl}/v1"));
                break;

            default:
                throw new ArgumentException($"Unknown provider: {provider}");
        }

        // Register plugins based on requested capabilities
        if (capabilities != null && capabilities.Count > 0)
        {
            foreach (var capabilityId in capabilities)
            {
                if (_plugins.TryGetValue(capabilityId, out var plugin))
                {
                    plugin.SetCurrentUserId(userId);
                    plugin.SetAgentRagEnabled(agentRagEnabled);
                    builder.Plugins.AddFromObject(plugin.GetPluginInstance(), plugin.GetPluginName());
                    _logger.LogDebug("Registered plugin {PluginName} for capability {CapabilityId}",
                        plugin.GetPluginName(), capabilityId);
                }
                else
                {
                    _logger.LogWarning("Unknown capability requested: {CapabilityId}", capabilityId);
                }
            }
        }

        return builder.Build();
    }

    /// <summary>
    /// Attempts to retrieve relevant note context for the user's query using semantic search.
    /// Returns null if no relevant context is found or if context retrieval is not applicable.
    /// Also returns the RagLogId for feedback submission when analytics are enabled.
    /// Uses the same RAG pipeline parameters as normal chat for consistent quality.
    /// </summary>
    private async Task<(string? ContextMessage, List<RetrievedNoteContext>? RetrievedNotes, Guid? RagLogId)> TryRetrieveContextAsync(
        string query,
        string userId,
        bool hasNotesCapability,
        CancellationToken cancellationToken)
    {
        if (!hasNotesCapability)
            return (null, null, null);

        if (!_intentDetector.ShouldRetrieveContext(query))
        {
            _logger.LogDebug("Query does not require context retrieval: {Query}",
                query.Substring(0, Math.Min(50, query.Length)));
            return (null, null, null);
        }

        try
        {
            _logger.LogInformation("Retrieving context for query using RAG settings (TopK: {TopK}, Threshold: {Threshold}): {Query}",
                _ragSettings.TopK, _ragSettings.SimilarityThreshold,
                query.Substring(0, Math.Min(50, query.Length)));

            // Use configuration-based parameters (same as normal chat) for consistent quality
            var ragContext = await _ragService.RetrieveContextAsync(
                query,
                userId,
                topK: _ragSettings.TopK,
                similarityThreshold: _ragSettings.SimilarityThreshold,
                cancellationToken: cancellationToken);

            if (!ragContext.RetrievedNotes.Any())
            {
                _logger.LogDebug("No relevant notes found for context injection");
                return (null, null, null);
            }

            // Deduplicate by NoteId, keeping highest score
            var uniqueNotes = ragContext.RetrievedNotes
                .GroupBy(r => r.NoteId)
                .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                .ToList();

            // Build context message using rich formatting similar to normal chat RAG
            var retrievedNotes = new List<RetrievedNoteContext>();
            var contextBuilder = new StringBuilder();
            contextBuilder.AppendLine("---RELEVANT NOTES CONTEXT (use for answering)---");
            contextBuilder.AppendLine();

            var noteIndex = 1;
            foreach (var note in uniqueNotes)
            {
                // Extract metadata from chunk content (uses same format as RagService)
                var parsedNote = SecondBrain.Application.Utilities.NoteContentParser.Parse(note.Content);
                
                // Get tags from parsed content or note metadata
                var tags = parsedNote.Tags?.Any() == true ? parsedNote.Tags : note.NoteTags;
                var tagsStr = tags?.Any() == true ? $"Tags: {string.Join(", ", tags)}" : "";

                // Build score information similar to normal chat
                var scoreInfo = $"Relevance: {note.SimilarityScore:F2}";
                if (note.Metadata != null)
                {
                    if (note.Metadata.TryGetValue("rerankScore", out var rerankScore) && rerankScore is float rs)
                        scoreInfo = $"Relevance: {rs:F1}/10, Semantic: {note.SimilarityScore:F2}";
                    else if (note.Metadata.TryGetValue("vectorScore", out var vectorScore) && vectorScore is float vs)
                        scoreInfo = $"Semantic: {vs:F2}";
                }

                // Use the actual chunk content that was matched (not a preview of the full note)
                // This is the key difference - we use the matched chunk content for accuracy
                var contentToShow = parsedNote.Content;
                if (string.IsNullOrWhiteSpace(contentToShow))
                {
                    // Fallback: extract content from raw chunk, skipping metadata lines
                    contentToShow = ExtractContentFromChunk(note.Content);
                }

                contextBuilder.AppendLine($"=== NOTE {noteIndex} ({scoreInfo}) ===");
                contextBuilder.AppendLine($"Title: {parsedNote.Title ?? note.NoteTitle}");
                contextBuilder.AppendLine($"Note ID: {note.NoteId}");
                if (!string.IsNullOrEmpty(tagsStr))
                    contextBuilder.AppendLine(tagsStr);
                if (parsedNote.CreatedDate.HasValue)
                    contextBuilder.AppendLine($"Created: {parsedNote.CreatedDate:yyyy-MM-dd}");
                if (parsedNote.UpdatedDate.HasValue)
                    contextBuilder.AppendLine($"Last Updated: {parsedNote.UpdatedDate:yyyy-MM-dd}");
                contextBuilder.AppendLine();
                contextBuilder.AppendLine("Content:");
                contextBuilder.AppendLine(contentToShow);
                contextBuilder.AppendLine();

                // Build preview for UI display (limited length)
                var previewForUI = contentToShow.Length > 300 
                    ? contentToShow.Substring(0, 300) + "..." 
                    : contentToShow;

                retrievedNotes.Add(new RetrievedNoteContext
                {
                    NoteId = note.NoteId,
                    Title = parsedNote.Title ?? note.NoteTitle,
                    Preview = previewForUI,
                    Tags = tags?.ToList() ?? new List<string>(),
                    SimilarityScore = note.SimilarityScore,
                    ChunkContent = contentToShow  // Include full chunk content
                });

                noteIndex++;
            }

            contextBuilder.AppendLine("---END CONTEXT---");
            contextBuilder.AppendLine();
            contextBuilder.AppendLine("INSTRUCTIONS:");
            contextBuilder.AppendLine("- Answer using the information from the retrieved notes above.");
            contextBuilder.AppendLine("- Cite notes by title when using their information: [Note Title]");
            contextBuilder.AppendLine("- If you need more details from a note, use GetNote tool with the Note ID.");
            contextBuilder.AppendLine("- If the context doesn't contain the answer, say so clearly.");

            _logger.LogInformation("Injected rich context from {Count} notes with RagLogId: {RagLogId}", 
                retrievedNotes.Count, ragContext.RagLogId);

            return (contextBuilder.ToString(), retrievedNotes, ragContext.RagLogId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve context for query, proceeding without context");
            return (null, null, null);
        }
    }

    /// <summary>
    /// Extracts meaningful content from a raw chunk, skipping metadata lines.
    /// Used as fallback when NoteContentParser doesn't find a Content section.
    /// </summary>
    private static string ExtractContentFromChunk(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return string.Empty;

        var lines = rawContent.Split('\n');
        var contentLines = new List<string>();

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();

            // Skip metadata lines we already display separately
            if (trimmedLine.StartsWith("Title:") ||
                trimmedLine.StartsWith("Tags:") ||
                trimmedLine.StartsWith("Created:") ||
                trimmedLine.StartsWith("Last Updated:") ||
                trimmedLine == "Content:")
            {
                continue;
            }

            // Add any other non-empty lines as content
            if (!string.IsNullOrWhiteSpace(trimmedLine))
            {
                contentLines.Add(trimmedLine);
            }
        }

        return string.Join("\n", contentLines).Trim();
    }

    /// <summary>
    /// Gets the last user message from the request
    /// </summary>
    private static string? GetLastUserMessage(AgentRequest request)
    {
        return request.Messages
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            ?.Content;
    }

    /// <summary>
    /// Checks if notes capability is enabled for the request
    /// </summary>
    private static bool HasNotesCapability(AgentRequest request)
    {
        return request.Capabilities?.Contains("notes", StringComparer.OrdinalIgnoreCase) ?? false;
    }

    internal string GetSystemPrompt(List<string>? capabilities)
    {
        var basePrompt = @"You are an intelligent AI assistant that helps users accomplish tasks effectively.

## Core Principles

1. **Simplicity**: Keep responses focused and avoid unnecessary complexity
2. **Transparency**: Show your reasoning before taking actions
3. **Accuracy**: Use tools correctly and maintain context across the conversation

## Reasoning Process

Before taking any action, show your thinking using this format:

<thinking>
1. What is the user asking for?
2. What approach will I take?
3. Which tool(s) will I use and why?
</thinking>

Keep reasoning concise but informative. Show additional reasoning when:
- Starting a new task
- Changing approaches
- Encountering unexpected results

## Tool Usage Guidelines

When you have tools available:
- **Always use them** - Never say you cannot do something your tools can do
- **Never give manual instructions** when a tool can accomplish the task
- **Track context** - Remember IDs, names, and results from previous tool calls
- **Handle references** - When user says ""that"" or ""it"", use conversation history to identify what they mean

## Incremental Operations

For tasks involving large content generation:
- **Break into steps**: Create initial content, then append sections incrementally
- **Announce your plan**: State how many steps/sections before starting
- **Track IDs**: Explicitly note resource IDs from tool responses for follow-up operations
- **Confirm progress**: After each step, state what was completed and what remains

This approach prevents token limits from truncating content during generation.

## Response Style

- Be concise and direct
- Focus on insights and suggestions rather than repeating displayed information
- Confirm actions completed and mention relevant IDs for future reference
- Ask clarifying questions only when truly ambiguous

## Context Awareness

Your conversation history includes previous tool executions with their results. Use this to:
- Reference IDs from previous operations
- Understand current state after modifications
- Avoid redundant questions

**Important**: Text marked with ""---SYSTEM CONTEXT---"" is internal context. Never reproduce this format in your responses.

## Error Handling

If a tool call fails:
1. Understand the error message
2. Try an alternative approach if available
3. Clearly explain to the user what happened and suggest next steps";

        // Add capability-specific prompts
        var capabilityPrompts = new StringBuilder();
        if (capabilities != null && capabilities.Count > 0)
        {
            foreach (var capabilityId in capabilities)
            {
                if (_plugins.TryGetValue(capabilityId, out var plugin))
                {
                    capabilityPrompts.AppendLine();
                    capabilityPrompts.Append(plugin.GetSystemPromptAddition());
                }
            }
        }
        else
        {
            // No capabilities - general assistant mode
            capabilityPrompts.AppendLine();
            capabilityPrompts.AppendLine("## General Assistant Mode");
            capabilityPrompts.AppendLine();
            capabilityPrompts.AppendLine("You are operating as a general assistant without specialized tools.");
            capabilityPrompts.AppendLine("Help users with questions, explanations, analysis, and conversation.");
            capabilityPrompts.AppendLine("If the user asks for actions that would require tools (like managing notes), ");
            capabilityPrompts.AppendLine("explain that they need to enable the relevant capability to perform those actions.");
        }

        return basePrompt + capabilityPrompts.ToString();
    }
}
