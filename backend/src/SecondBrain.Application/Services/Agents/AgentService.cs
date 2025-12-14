using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents;

/// <summary>
/// Agent service that orchestrates AI agent interactions with tool execution.
/// Delegates provider-specific logic to streaming strategies.
/// </summary>
public class AgentService : IAgentService
{
    private readonly IAgentStreamingStrategyFactory _strategyFactory;
    private readonly AIProvidersSettings _settings;
    private readonly RagSettings _ragSettings;
    private readonly IRagService _ragService;
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<AgentService> _logger;
    private readonly Dictionary<string, IAgentPlugin> _plugins = new();

    public AgentService(
        IAgentStreamingStrategyFactory strategyFactory,
        IOptions<AIProvidersSettings> settings,
        IOptions<RagSettings> ragSettings,
        IParallelNoteRepository noteRepository,
        IRagService ragService,
        IUserPreferencesService userPreferencesService,
        ILogger<AgentService> logger,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
    {
        _strategyFactory = strategyFactory;
        _settings = settings.Value;
        _ragSettings = ragSettings.Value;
        _ragService = ragService;
        _userPreferencesService = userPreferencesService;
        _logger = logger;

        // Register available plugins
        // NotesPlugin uses INoteOperationService for all mutations (create, update, delete, append)
        RegisterPlugin(new NotesPlugin(noteRepository, ragService, ragSettings.Value, structuredOutputService, noteOperationService));
    }

    private void RegisterPlugin(IAgentPlugin plugin)
    {
        _plugins[plugin.CapabilityId] = plugin;
    }

    /// <inheritdoc />
    public IReadOnlyList<AgentCapability> GetAvailableCapabilities()
    {
        return _plugins.Values.Select(p => new AgentCapability
        {
            Id = p.CapabilityId,
            DisplayName = p.DisplayName,
            Description = p.Description
        }).ToList().AsReadOnly();
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<AgentStreamEvent> ProcessStreamAsync(
        AgentRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing agent request. Provider: {Provider}, Model: {Model}, UserId: {UserId}",
            request.Provider, request.Model, request.UserId);

        yield return new AgentStreamEvent
        {
            Type = AgentEventType.Status,
            Content = "Initializing agent..."
        };

        // Create streaming context
        var context = new AgentStreamingContext
        {
            Request = request,
            Settings = _settings,
            RagSettings = _ragSettings,
            Plugins = _plugins,
            Logger = _logger,
            RagService = _ragService,
            UserPreferencesService = _userPreferencesService,
            GetSystemPrompt = GetSystemPrompt
        };

        // Get appropriate strategy via factory
        var strategy = _strategyFactory.GetStrategy(request, _settings);

        _logger.LogDebug("Using strategy {StrategyType} for provider {Provider}",
            strategy.GetType().Name, request.Provider);

        // Delegate to strategy
        await foreach (var evt in strategy.ProcessAsync(context, cancellationToken))
        {
            yield return evt;
        }
    }

    /// <inheritdoc />
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
    /// Generates the system prompt for the agent, including capability-specific additions.
    /// </summary>
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
