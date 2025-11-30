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
    private readonly INoteRepository _noteRepository;
    private readonly IRagService _ragService;
    private readonly ILogger<AgentService> _logger;
    private readonly Dictionary<string, IAgentPlugin> _plugins = new();

    public AgentService(
        IOptions<AIProvidersSettings> settings,
        INoteRepository noteRepository,
        IRagService ragService,
        ILogger<AgentService> logger)
    {
        _settings = settings.Value;
        _noteRepository = noteRepository;
        _ragService = ragService;
        _logger = logger;

        // Register available plugins
        RegisterPlugin(new NotesPlugin(noteRepository, ragService));
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
            kernel = BuildKernel(request.Provider, request.Model, request.UserId, request.Capabilities, request.OllamaBaseUrl);
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

        var systemPrompt = GetSystemPrompt(request.Capabilities);
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
                    Content = "Calling Claude model..."
                };
            }
            else
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Status,
                    Content = "Processing tool results..."
                };
            }

            var parameters = new MessageParameters
            {
                Model = request.Model,
                Messages = messages,
                MaxTokens = request.MaxTokens ?? 4096,
                System = new List<SystemMessage> { new SystemMessage(systemPrompt) },
                Temperature = request.Temperature.HasValue ? (decimal)request.Temperature.Value : 0.7m
            };

            if (tools.Count > 0)
            {
                parameters.Tools = tools;
            }

            MessageResponse? response = null;
            var shouldContinue = false;
            string? errorMessage = null;

            // Use non-streaming API for simpler tool handling
            try
            {
                response = await client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Anthropic API");
                errorMessage = ex.Message;
            }

            // Handle error outside of catch block
            if (errorMessage != null)
            {
                yield return new AgentStreamEvent
                {
                    Type = AgentEventType.Error,
                    Content = $"Error: {errorMessage}"
                };
                yield break;
            }

            // Process the response content
            if (response?.Content != null)
            {
                // Emit status that we're now generating the response
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
                    }
                }

                // Check for tool use
                var toolUseBlocks = response.Content.OfType<ToolUseContent>().ToList();
                if (toolUseBlocks.Any())
                {
                    // Emit status for executing tools
                    yield return new AgentStreamEvent
                    {
                        Type = AgentEventType.Status,
                        Content = $"Executing {toolUseBlocks.Count} tool{(toolUseBlocks.Count > 1 ? "s" : "")}..."
                    };

                    // Add assistant message with tool use to history
                    var assistantMsg = new Anthropic.SDK.Messaging.Message
                    {
                        Role = RoleType.Assistant,
                        Content = response.Content
                    };
                    messages.Add(assistantMsg);

                    // Execute tools and collect results
                    var toolResults = new List<ContentBase>();

                    foreach (var toolUse in toolUseBlocks)
                    {
                        yield return new AgentStreamEvent
                        {
                            Type = AgentEventType.ToolCallStart,
                            ToolName = toolUse.Name,
                            ToolArguments = toolUse.Input?.ToString() ?? "{}"
                        };

                        string result;
                        try
                        {
                            if (pluginMethods.TryGetValue(toolUse.Name, out var pluginMethod))
                            {
                                result = await InvokePluginMethodAsync(
                                    pluginMethod.Plugin,
                                    pluginMethod.Method,
                                    toolUse.Input);
                            }
                            else
                            {
                                result = $"Error: Unknown tool '{toolUse.Name}'";
                            }
                        }
                        catch (Exception ex)
                        {
                            result = $"Error executing tool: {ex.Message}";
                            _logger.LogError(ex, "Error executing tool {ToolName}", toolUse.Name);
                        }

                        yield return new AgentStreamEvent
                        {
                            Type = AgentEventType.ToolCallEnd,
                            ToolName = toolUse.Name,
                            ToolResult = result
                        };

                        toolResults.Add(new ToolResultContent
                        {
                            ToolUseId = toolUse.Id,
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

    private static string GetJsonSchemaType(Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        if (underlyingType == typeof(string)) return "string";
        if (underlyingType == typeof(int) || underlyingType == typeof(long)) return "integer";
        if (underlyingType == typeof(float) || underlyingType == typeof(double) || underlyingType == typeof(decimal)) return "number";
        if (underlyingType == typeof(bool)) return "boolean";
        if (underlyingType.IsArray || (underlyingType.IsGenericType && underlyingType.GetGenericTypeDefinition() == typeof(List<>))) return "array";

        return "string";
    }

    private async Task<string> InvokePluginMethodAsync(IAgentPlugin plugin, System.Reflection.MethodInfo method, JsonNode? input)
    {
        var parameters = method.GetParameters();
        var args = new object?[parameters.Length];

        for (int i = 0; i < parameters.Length; i++)
        {
            var param = parameters[i];
            var paramName = param.Name!;

            if (input is JsonObject jsonObj && jsonObj.TryGetPropertyValue(paramName, out var value))
            {
                args[i] = ConvertJsonToType(value, param.ParameterType);
            }
            else if (param.HasDefaultValue)
            {
                args[i] = param.DefaultValue;
            }
            else
            {
                args[i] = null;
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

    private static object? ConvertJsonToType(JsonNode? node, Type targetType)
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

    private Kernel BuildKernel(string provider, string model, string userId, List<string>? capabilities, string? ollamaBaseUrl = null)
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

    private string GetSystemPrompt(List<string>? capabilities)
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
