using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Filter to capture function invocation results for streaming.
/// </summary>
internal class FunctionInvocationFilter : IFunctionInvocationFilter
{
    private readonly ConcurrentQueue<(string Name, string Arguments, string Result)> _results = new();

    public ConcurrentQueue<(string Name, string Arguments, string Result)> Results => _results;

    public async Task OnFunctionInvocationAsync(FunctionInvocationContext context, Func<FunctionInvocationContext, Task> next)
    {
        var functionName = context.Function.Name;
        var arguments = context.Arguments != null
            ? System.Text.Json.JsonSerializer.Serialize(context.Arguments.ToDictionary(kvp => kvp.Key, kvp => kvp.Value?.ToString()))
            : "";

        await next(context);

        var result = context.Result?.ToString() ?? "";
        _results.Enqueue((functionName, arguments, result));
    }
}

/// <summary>
/// Fallback strategy using Semantic Kernel for providers without native function calling support.
/// Works with OpenAI-compatible providers.
/// </summary>
public class SemanticKernelStreamingStrategy : BaseAgentStreamingStrategy
{
    private readonly AIProvidersSettings _settings;
    private readonly ILogger<SemanticKernelStreamingStrategy> _logger;

    public SemanticKernelStreamingStrategy(
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy retryPolicy,
        Microsoft.Extensions.Options.IOptions<AIProvidersSettings> settings,
        ILogger<SemanticKernelStreamingStrategy> logger)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "openai", "gemini", "ollama", "grok", "xai" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
    {
        // This is the fallback strategy - always returns false so factory uses it as fallback
        return false;
    }

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = context.Request;
        var hasCapabilities = request.Capabilities != null && request.Capabilities.Count > 0;

        if (hasCapabilities)
        {
            yield return StatusEvent("Preparing tools...");
        }

        Kernel? kernel = null;
        string? initError = null;

        try
        {
            kernel = BuildKernel(request, context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build kernel for provider {Provider}", request.Provider);
            initError = $"Failed to initialize agent: {ex.Message}";
        }

        if (initError != null)
        {
            yield return ErrorEvent(initError);
            yield break;
        }

        yield return StatusEvent("Building conversation context...");

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(context.GetSystemPrompt(request.Capabilities));

        foreach (var message in request.Messages)
        {
            if (message.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            {
                chatHistory.AddUserMessage(message.Content);
            }
            else if (message.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase))
            {
                if (message.ToolCalls != null && message.ToolCalls.Any())
                {
                    var contextBuilder = new StringBuilder();
                    if (!string.IsNullOrWhiteSpace(message.Content))
                        contextBuilder.AppendLine(message.Content);
                    contextBuilder.AppendLine();
                    contextBuilder.AppendLine("---SYSTEM CONTEXT (DO NOT REPRODUCE THIS FORMAT IN YOUR RESPONSE)---");
                    contextBuilder.AppendLine("Tools executed in previous turn:");
                    foreach (var toolCall in message.ToolCalls)
                        contextBuilder.AppendLine($"  {toolCall.ToolName}: {toolCall.Result}");
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

        var functionFilter = new FunctionInvocationFilter();
        kernel.FunctionInvocationFilters.Add(functionFilter);

        var settings = new OpenAIPromptExecutionSettings
        {
            Temperature = request.Temperature ?? 0.7,
            MaxTokens = request.MaxTokens ?? 4096,
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
        };

        var fullResponse = new StringBuilder();
        var emittedToolCalls = new HashSet<string>();
        var emittedThinkingBlocks = new HashSet<string>();
        var hasEmittedFirstToken = false;

        yield return StatusEvent($"Calling {request.Provider} model...");

        await foreach (var update in chatService.GetStreamingChatMessageContentsAsync(
            chatHistory, settings, kernel, cancellationToken))
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            // Emit status on first content
            if (!hasEmittedFirstToken && !string.IsNullOrEmpty(update.Content))
            {
                hasEmittedFirstToken = true;
                yield return StatusEvent("Generating response...");
            }

            // Check for completed function invocations
            while (functionFilter.Results.TryDequeue(out var toolResult))
            {
                var toolKey = $"{toolResult.Name}_{toolResult.Arguments}";
                if (!emittedToolCalls.Contains(toolKey))
                {
                    emittedToolCalls.Add(toolKey);
                    var streamToolId = $"toolu_{ToolExecutor.GenerateToolId(toolResult.Name, toolResult.Arguments)}";

                    yield return ToolCallStartEvent(toolResult.Name, streamToolId, toolResult.Arguments);
                    yield return ToolCallEndEvent(toolResult.Name, streamToolId, toolResult.Result);
                }
            }

            if (!string.IsNullOrEmpty(update.Content))
            {
                fullResponse.Append(update.Content);

                // Check for thinking blocks
                foreach (var thinkingContent in ThinkingExtractor.ExtractXmlThinkingBlocks(
                    fullResponse.ToString(), emittedThinkingBlocks))
                {
                    yield return ThinkingEvent(thinkingContent);
                }

                yield return TokenEvent(update.Content);
            }
        }

        // Process remaining tool results
        while (functionFilter.Results.TryDequeue(out var toolResult))
        {
            var toolKey = $"{toolResult.Name}_{toolResult.Arguments}";
            if (!emittedToolCalls.Contains(toolKey))
            {
                emittedToolCalls.Add(toolKey);
                var remainingToolId = $"toolu_{ToolExecutor.GenerateToolId(toolResult.Name, toolResult.Arguments)}";

                yield return ToolCallStartEvent(toolResult.Name, remainingToolId, toolResult.Arguments);
                yield return ToolCallEndEvent(toolResult.Name, remainingToolId, toolResult.Result);
            }
        }

        yield return EndEvent(fullResponse.ToString());
    }

    private Kernel BuildKernel(AgentRequest request, AgentStreamingContext context)
    {
        var builder = Kernel.CreateBuilder();

        switch (request.Provider.ToLowerInvariant())
        {
            case "openai":
                if (!_settings.OpenAI.Enabled || string.IsNullOrEmpty(_settings.OpenAI.ApiKey))
                    throw new InvalidOperationException("OpenAI provider is not enabled or configured");
                builder.AddOpenAIChatCompletion(modelId: request.Model, apiKey: _settings.OpenAI.ApiKey);
                break;

            case "grok":
            case "xai":
                if (!_settings.XAI.Enabled || string.IsNullOrEmpty(_settings.XAI.ApiKey))
                    throw new InvalidOperationException("xAI/Grok provider is not enabled or configured");
                builder.AddOpenAIChatCompletion(
                    modelId: request.Model,
                    apiKey: _settings.XAI.ApiKey,
                    endpoint: new Uri(_settings.XAI.BaseUrl));
                break;

            case "claude":
            case "anthropic":
                throw new InvalidOperationException("Anthropic provider should be handled by AnthropicStreamingStrategy");

            case "gemini":
                if (!_settings.Gemini.Enabled || string.IsNullOrEmpty(_settings.Gemini.ApiKey))
                    throw new InvalidOperationException("Gemini provider is not enabled or configured");
                builder.AddOpenAIChatCompletion(
                    modelId: request.Model,
                    apiKey: _settings.Gemini.ApiKey,
                    endpoint: new Uri("https://generativelanguage.googleapis.com/v1beta/openai/"));
                break;

            case "ollama":
                if (!_settings.Ollama.Enabled)
                    throw new InvalidOperationException("Ollama provider is not enabled");
                var effectiveOllamaUrl = !string.IsNullOrWhiteSpace(request.OllamaBaseUrl)
                    ? request.OllamaBaseUrl.TrimEnd('/')
                    : _settings.Ollama.BaseUrl;
                builder.AddOpenAIChatCompletion(
                    modelId: request.Model,
                    apiKey: "ollama",
                    endpoint: new Uri($"{effectiveOllamaUrl}/v1"));
                break;

            default:
                throw new ArgumentException($"Unknown provider: {request.Provider}");
        }

        // Register plugins
        if (request.Capabilities != null && request.Capabilities.Count > 0)
        {
            foreach (var capabilityId in request.Capabilities)
            {
                if (context.Plugins.TryGetValue(capabilityId, out var plugin))
                {
                    plugin.SetCurrentUserId(request.UserId);
                    plugin.SetAgentRagEnabled(request.AgentRagEnabled);
                    plugin.SetRagOptions(request.RagOptions);
                    builder.Plugins.AddFromObject(plugin.GetPluginInstance(), plugin.GetPluginName());
                    _logger.LogDebug("Registered plugin {PluginName} for capability {CapabilityId}",
                        plugin.GetPluginName(), capabilityId);
                }
            }
        }

        return builder.Build();
    }
}
