using System.ComponentModel;
using System.Reflection;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.GrokRealtime;

/// <summary>
/// Handles Grok Voice (xAI Realtime) sessions with unified speech-to-speech processing
/// </summary>
public class GrokVoiceHandler : IGrokVoiceHandler
{
    private readonly IGrokRealtimeClient _realtimeClient;
    private readonly IVoiceSessionManager _sessionManager;
    private readonly VoiceSettings _voiceSettings;
    private readonly IToolExecutor _toolExecutor;
    private readonly IReadOnlyDictionary<string, IAgentPlugin> _plugins;
    private readonly ILogger<GrokVoiceHandler> _logger;

    private VoiceSession? _session;
    private IVoiceEventEmitter? _eventEmitter;
    private bool _disposed;
    private int _audioSequence;
    private StringBuilder _currentTranscript = new();
    private StringBuilder _currentResponseText = new();

    // Plugin method mappings for custom function tools
    private Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> _pluginMethods = new();

    public bool IsConnected => _realtimeClient.IsConnected;

    /// <summary>
    /// Maximum allowed audio chunk size (1MB) to prevent memory issues
    /// </summary>
    private const int MaxAudioChunkSize = 1024 * 1024;

    public GrokVoiceHandler(
        IGrokRealtimeClient realtimeClient,
        IVoiceSessionManager sessionManager,
        IOptions<VoiceSettings> voiceSettings,
        IToolExecutor toolExecutor,
        IEnumerable<IAgentPlugin> plugins,
        ILogger<GrokVoiceHandler> logger)
    {
        _realtimeClient = realtimeClient;
        _sessionManager = sessionManager;
        _voiceSettings = voiceSettings.Value;
        _toolExecutor = toolExecutor;
        _plugins = plugins.ToDictionary(p => p.CapabilityId, StringComparer.OrdinalIgnoreCase);
        _logger = logger;
    }

    public async Task InitializeAsync(
        VoiceSession session,
        IVoiceEventEmitter eventEmitter,
        CancellationToken cancellationToken = default)
    {
        _session = session;
        _eventEmitter = eventEmitter;

        _logger.LogInformation(
            "Initializing Grok Voice session {SessionId}. AgentEnabled={AgentEnabled}, Capabilities=[{Capabilities}], PluginsAvailable={PluginCount}",
            session.Id,
            session.Options.AgentEnabled,
            string.Join(", ", session.Options.Capabilities),
            _plugins.Count);

        // Build session configuration
        var config = BuildSessionConfig(session);

        // Connect to xAI Realtime
        await _realtimeClient.ConnectAsync(config, cancellationToken);

        _logger.LogInformation(
            "Grok Voice session {SessionId} connected. Tools registered: {ToolCount}, CustomTools: {CustomToolCount}",
            session.Id,
            config.Tools?.Count ?? 0,
            _pluginMethods.Count);
    }

    public async Task ProcessAudioAsync(byte[] audioData, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            _logger.LogWarning("Cannot process audio - not connected to xAI Realtime");
            return;
        }

        if (audioData.Length > MaxAudioChunkSize)
        {
            _logger.LogWarning("Audio chunk size {Size} bytes exceeds maximum limit of {Limit} bytes. Skipping chunk.",
                audioData.Length, MaxAudioChunkSize);
            return;
        }

        await _realtimeClient.SendAudioAsync(audioData, cancellationToken);
    }

    public async Task InterruptAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected) return;

        _logger.LogDebug("Interrupting Grok Voice response");
        await _realtimeClient.CancelResponseAsync(cancellationToken);

        if (_session != null && _eventEmitter != null)
        {
            await _sessionManager.UpdateSessionStateAsync(_session.Id, VoiceSessionState.Interrupted);
            await _eventEmitter.SendStateAsync(VoiceSessionState.Interrupted, "User interrupted", cancellationToken: cancellationToken);
        }
    }

    public async Task RunEventLoopAsync(CancellationToken cancellationToken = default)
    {
        if (_session == null || _eventEmitter == null)
        {
            throw new InvalidOperationException("Handler not initialized");
        }

        _logger.LogInformation("Starting Grok Voice event loop for session {SessionId}", _session.Id);

        try
        {
            await foreach (var evt in _realtimeClient.ReceiveEventsAsync(cancellationToken))
            {
                await ProcessEventAsync(evt, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("Grok Voice event loop cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Grok Voice event loop");
            if (_eventEmitter != null)
            {
                await _eventEmitter.SendErrorAsync("GROK_VOICE_ERROR", ex.Message, false, cancellationToken);
            }
        }
    }

    public async Task DisconnectAsync()
    {
        _logger.LogInformation("Disconnecting Grok Voice handler");
        await _realtimeClient.DisconnectAsync();
    }

    private async Task ProcessEventAsync(GrokRealtimeEvent evt, CancellationToken cancellationToken)
    {
        // Capture references locally to prevent race conditions in concurrent scenarios
        var session = _session;
        var eventEmitter = _eventEmitter;
        if (eventEmitter == null || session == null) return;

        switch (evt.EventType)
        {
            case GrokRealtimeEventType.Error:
                await HandleErrorEventAsync((GrokErrorEvent)evt, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.SessionCreated:
                await HandleSessionCreatedAsync((GrokSessionCreatedEvent)evt, session, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.InputAudioBufferSpeechStarted:
                await HandleSpeechStartedAsync(session, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.InputAudioBufferSpeechStopped:
                await HandleSpeechStoppedAsync(session, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ConversationItemInputAudioTranscriptionCompleted:
                await HandleTranscriptionCompletedAsync((GrokTranscriptionCompletedEvent)evt, session, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseCreated:
                await HandleResponseCreatedAsync(session, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseAudioDelta:
                await HandleAudioDeltaAsync((GrokAudioDeltaEvent)evt, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseAudioDone:
                await HandleAudioDoneAsync(cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseTextDelta:
                await HandleTextDeltaAsync((GrokTextDeltaEvent)evt, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseAudioTranscriptDelta:
                await HandleAudioTranscriptDeltaAsync((GrokAudioTranscriptDeltaEvent)evt, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseFunctionCallArgumentsDone:
                await HandleFunctionCallDoneAsync((GrokFunctionCallArgumentsDoneEvent)evt, eventEmitter, cancellationToken);
                break;

            case GrokRealtimeEventType.ResponseDone:
                await HandleResponseDoneAsync((GrokResponseDoneEvent)evt, session, eventEmitter, cancellationToken);
                break;

            default:
                _logger.LogTrace("Unhandled Grok event type: {EventType}", evt.TypeString);
                break;
        }
    }

    private async Task HandleErrorEventAsync(GrokErrorEvent evt, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        var error = evt.Error;
        _logger.LogError("Grok Realtime error: {Type} - {Message}", error?.Type, error?.Message);
        await eventEmitter.SendErrorAsync(
            error?.Code ?? "GROK_ERROR",
            error?.Message ?? "Unknown error",
            true,
            ct);
    }

    private async Task HandleSessionCreatedAsync(GrokSessionCreatedEvent evt, VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        _logger.LogInformation("Grok session created: {SessionId}, Voice: {Voice}",
            evt.Session?.Id, evt.Session?.Voice);

        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
        await eventEmitter.SendStateAsync(VoiceSessionState.Idle, cancellationToken: ct);
    }

    private async Task HandleSpeechStartedAsync(VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        _logger.LogDebug("Speech started detected by Grok");
        _currentTranscript.Clear();

        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Listening);
        await eventEmitter.SendStateAsync(VoiceSessionState.Listening, cancellationToken: ct);
    }

    private async Task HandleSpeechStoppedAsync(VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        _logger.LogDebug("Speech stopped detected by Grok");
        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Processing);
        await eventEmitter.SendStateAsync(VoiceSessionState.Processing, cancellationToken: ct);
    }

    private async Task HandleTranscriptionCompletedAsync(GrokTranscriptionCompletedEvent evt, VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        var transcript = evt.Transcript ?? "";
        _logger.LogDebug("Transcription completed: {Transcript}", transcript);

        // Send final transcript to frontend
        var result = new TranscriptionResult
        {
            Text = transcript,
            IsFinal = true,
            Confidence = 1.0
        };
        await eventEmitter.SendTranscriptAsync(result, ct);

        // Add user turn to session
        await _sessionManager.AddTurnAsync(session.Id, new VoiceTurn
        {
            Role = "user",
            Content = transcript,
            Confidence = 1.0
        });
    }

    private async Task HandleResponseCreatedAsync(VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        _logger.LogDebug("Grok response created");
        _currentResponseText.Clear();
        _audioSequence = 0;

        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Speaking);
        await eventEmitter.SendStateAsync(VoiceSessionState.Speaking, cancellationToken: ct);
        await eventEmitter.SendAiResponseStartAsync(ct);
    }

    private async Task HandleAudioDeltaAsync(GrokAudioDeltaEvent evt, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(evt.Delta)) return;

        // Decode base64 audio
        var audioBytes = Convert.FromBase64String(evt.Delta);

        // Send audio to frontend (xAI Realtime API uses 24kHz PCM16)
        await eventEmitter.SendAudioAsync(
            audioBytes,
            "pcm_24000",
            24000,
            _audioSequence++,
            ct);
    }

    private Task HandleAudioDoneAsync(CancellationToken ct)
    {
        // Use cancellation token in logging to maintain consistency with other handlers
        ct.ThrowIfCancellationRequested();
        _logger.LogDebug("Grok audio done, sequence: {Sequence}", _audioSequence);
        // Final audio chunk indicator is handled by response.done
        return Task.CompletedTask;
    }

    private async Task HandleTextDeltaAsync(GrokTextDeltaEvent evt, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(evt.Delta)) return;

        _currentResponseText.Append(evt.Delta);

        // Send text chunk to frontend for display
        await eventEmitter.SendAiResponseChunkAsync(
            evt.Delta,
            _currentResponseText.ToString(),
            ct);
    }

    private async Task HandleAudioTranscriptDeltaAsync(GrokAudioTranscriptDeltaEvent evt, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        // This is the transcription of what the AI is saying
        if (string.IsNullOrEmpty(evt.Delta)) return;

        _currentResponseText.Append(evt.Delta);

        await eventEmitter.SendAiResponseChunkAsync(
            evt.Delta,
            _currentResponseText.ToString(),
            ct);
    }

    private async Task HandleFunctionCallDoneAsync(GrokFunctionCallArgumentsDoneEvent evt, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        var toolName = evt.Name ?? "unknown";
        var arguments = evt.Arguments ?? "{}";
        var callId = evt.CallId ?? Guid.NewGuid().ToString();

        _logger.LogInformation("Grok function call: {Name} with args: {Args}", toolName, arguments);

        // Send tool call start event (for UI tracking)
        await eventEmitter.SendToolCallStartAsync(callId, toolName, arguments, ct);

        // Handle built-in tools (web_search, x_search) - xAI handles execution
        if (toolName is "web_search" or "x_search")
        {
            // For built-in tools, xAI handles execution and returns results
            // We emit this as a grounding sources event
            var groundingEvent = new AgentStreamEvent
            {
                Type = AgentEventType.Grounding,
                GroundingSources = new List<GroundingSource>
                {
                    new GroundingSource
                    {
                        Title = $"{toolName} results",
                        Uri = $"grok://{toolName}",
                        Snippet = $"Search via {toolName}: {arguments}"
                    }
                }
            };
            await eventEmitter.SendGroundingSourcesAsync(groundingEvent, ct);

            // Send tool call end event (built-in tools complete immediately)
            await eventEmitter.SendToolCallEndAsync(callId, toolName, $"Search completed via {toolName}", ct);
            return;
        }

        // Handle custom function tools - execute locally
        if (_pluginMethods.TryGetValue(toolName, out var pluginMethod))
        {
            try
            {
                _logger.LogInformation("Executing custom tool {ToolName} via ToolExecutor", toolName);

                // Parse arguments
                var argsNode = JsonNode.Parse(arguments);
                var pendingCall = new PendingToolCall(callId, toolName, arguments, argsNode);

                // Execute the tool
                var result = await _toolExecutor.ExecuteAsync(
                    pendingCall,
                    pluginMethod.Plugin,
                    pluginMethod.Method,
                    ct);

                _logger.LogInformation("Tool {ToolName} executed: Success={Success}, ResultLength={Length}",
                    toolName, result.Success, result.Result.Length);

                // Send tool call end event with result
                await eventEmitter.SendToolCallEndAsync(callId, toolName, result.Result, ct);

                // Send function output back to xAI to continue the conversation
                await _realtimeClient.SendFunctionCallOutputAsync(callId, result.Result, ct);

                // Trigger a new response to continue the conversation with the tool result
                await _realtimeClient.CreateResponseAsync(cancellationToken: ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing custom tool {ToolName}", toolName);

                var errorResult = $"Error executing tool: {ex.Message}";
                await eventEmitter.SendToolCallEndAsync(callId, toolName, errorResult, ct);

                // Send error back to xAI so it can inform the user
                await _realtimeClient.SendFunctionCallOutputAsync(callId, errorResult, ct);
                await _realtimeClient.CreateResponseAsync(cancellationToken: ct);
            }
        }
        else
        {
            _logger.LogWarning("Unknown tool called: {ToolName}. Available tools: {Available}",
                toolName, string.Join(", ", _pluginMethods.Keys));

            await eventEmitter.SendToolCallEndAsync(callId, toolName, $"Unknown tool: {toolName}", ct);
        }
    }

    private async Task HandleResponseDoneAsync(GrokResponseDoneEvent evt, VoiceSession session, IVoiceEventEmitter eventEmitter, CancellationToken ct)
    {
        var usage = evt.Response?.Usage;
        _logger.LogInformation("Grok response done. Tokens - Input: {Input}, Output: {Output}",
            usage?.InputTokens, usage?.OutputTokens);

        // Add assistant turn to session
        if (_currentResponseText.Length > 0)
        {
            await _sessionManager.AddTurnAsync(session.Id, new VoiceTurn
            {
                Role = "assistant",
                Content = _currentResponseText.ToString(),
                TokenUsage = usage != null ? new TokenUsage
                {
                    InputTokens = usage.InputTokens,
                    OutputTokens = usage.OutputTokens
                } : null
            });
        }

        // Send end event
        await eventEmitter.SendAiResponseEndAsync(
            _currentResponseText.ToString(),
            usage?.InputTokens ?? 0,
            usage?.OutputTokens ?? 0,
            ct);

        // Return to idle state
        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
        await eventEmitter.SendStateAsync(VoiceSessionState.Idle, cancellationToken: ct);

        // Reset state
        _currentResponseText.Clear();
    }

    private GrokRealtimeSessionConfig BuildSessionConfig(VoiceSession session)
    {
        var config = new GrokRealtimeSessionConfig
        {
            Voice = session.Options.GrokVoice,
            Modalities = new List<string> { "text", "audio" },
            InputAudioFormat = "pcm16",
            OutputAudioFormat = "pcm16",
            Temperature = session.Options.Temperature,
            MaxResponseOutputTokens = session.Options.MaxTokens,
            InputAudioTranscription = new GrokInputAudioTranscription { Model = "whisper-1" },
            TurnDetection = new GrokTurnDetection
            {
                Type = "server_vad",
                Threshold = _voiceSettings.GrokVoice?.VAD?.Threshold ?? 0.5f,
                SilenceDurationMs = _voiceSettings.GrokVoice?.VAD?.SilenceDurationMs ?? 500,
                PrefixPaddingMs = 300,
                CreateResponse = true,
                InterruptResponse = true
            }
        };

        // Add tools if enabled
        var tools = new List<GrokRealtimeTool>();

        // Add built-in tools
        if (session.Options.EnableGrokWebSearch)
        {
            tools.Add(GrokRealtimeTool.WebSearch());
        }

        if (session.Options.EnableGrokXSearch)
        {
            tools.Add(GrokRealtimeTool.XSearch());
        }

        // Add custom function tools if agent mode is enabled
        if (session.Options.AgentEnabled && session.Options.Capabilities.Count > 0)
        {
            var (customTools, pluginMethods) = BuildCustomFunctionTools(session);
            tools.AddRange(customTools);
            _pluginMethods = pluginMethods;

            _logger.LogInformation("Added {Count} custom function tools to Grok session for capabilities: {Capabilities}",
                customTools.Count, string.Join(", ", session.Options.Capabilities));
        }

        if (tools.Count > 0)
        {
            config.Tools = tools;
        }

        // Build system prompt with plugin instructions
        config.Instructions = BuildSystemPrompt(session);

        // Log the system prompt for debugging
        _logger.LogDebug(
            "Grok Voice system prompt ({Length} chars):\n{Instructions}",
            config.Instructions?.Length ?? 0,
            config.Instructions);

        // Log tool definitions
        foreach (var tool in tools)
        {
            _logger.LogDebug(
                "Grok Voice tool registered: Type={Type}, Name={Name}, Description={Description}",
                tool.Type, tool.Name ?? "(built-in)", tool.Description ?? "(none)");
        }

        return config;
    }

    private (List<GrokRealtimeTool> Tools, Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)> Methods) BuildCustomFunctionTools(VoiceSession session)
    {
        var tools = new List<GrokRealtimeTool>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>(StringComparer.OrdinalIgnoreCase);

        foreach (var capabilityId in session.Options.Capabilities)
        {
            if (!_plugins.TryGetValue(capabilityId, out var plugin))
            {
                _logger.LogWarning("Plugin not found for capability: {CapabilityId}", capabilityId);
                continue;
            }

            plugin.SetCurrentUserId(session.UserId);
            plugin.SetAgentRagEnabled(session.Options.EnableAgentRag);

            var pluginInstance = plugin.GetPluginInstance();
            var methods = pluginInstance.GetType().GetMethods(BindingFlags.Public | BindingFlags.Instance)
                .Where(m => m.GetCustomAttributes(typeof(KernelFunctionAttribute), false).Any());

            foreach (var method in methods)
            {
                var funcAttr = method.GetCustomAttribute<KernelFunctionAttribute>();
                var descAttr = method.GetCustomAttribute<DescriptionAttribute>();

                var toolName = funcAttr?.Name ?? method.Name;
                var toolDescription = descAttr?.Description ?? $"Function from {plugin.DisplayName}";

                // Build JSON Schema for parameters
                var schemaObj = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>(),
                    ["required"] = new List<string>()
                };

                var props = (Dictionary<string, object>)schemaObj["properties"];
                var required = (List<string>)schemaObj["required"];

                foreach (var param in method.GetParameters())
                {
                    if (param.ParameterType == typeof(CancellationToken)) continue;

                    var paramDesc = param.GetCustomAttribute<DescriptionAttribute>();
                    var paramType = param.ParameterType;

                    var propNode = new Dictionary<string, object>
                    {
                        ["type"] = GetJsonSchemaType(paramType)
                    };

                    if (paramDesc != null)
                    {
                        propNode["description"] = paramDesc.Description;
                    }

                    props[param.Name!] = propNode;

                    // Add to required if not optional
                    if (!param.HasDefaultValue && Nullable.GetUnderlyingType(paramType) == null)
                    {
                        required.Add(param.Name!);
                    }
                }

                tools.Add(GrokRealtimeTool.CustomFunction(toolName, toolDescription, schemaObj));
                pluginMethods[toolName] = (plugin, method);

                _logger.LogDebug("Registered Grok Voice tool: {ToolName} from plugin {Plugin}", toolName, plugin.CapabilityId);
            }
        }

        return (tools, pluginMethods);
    }

    private static string GetJsonSchemaType(Type type)
    {
        var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

        return underlyingType switch
        {
            Type t when t == typeof(string) => "string",
            Type t when t == typeof(int) || t == typeof(long) || t == typeof(short) => "integer",
            Type t when t == typeof(float) || t == typeof(double) || t == typeof(decimal) => "number",
            Type t when t == typeof(bool) => "boolean",
            Type t when t.IsArray || typeof(System.Collections.IEnumerable).IsAssignableFrom(t) && t != typeof(string) => "array",
            _ => "string"
        };
    }

    private string BuildSystemPrompt(VoiceSession session)
    {
        var hasNoteTools = session.Options.AgentEnabled && session.Options.Capabilities.Count > 0;
        var basePrompt = session.Options.SystemPrompt ?? GetDefaultSystemPrompt(hasNoteTools);

        if (!hasNoteTools)
        {
            return basePrompt;
        }

        var sb = new StringBuilder(basePrompt);
        sb.AppendLine();
        sb.AppendLine();
        sb.AppendLine("## Your Available Tools");
        sb.AppendLine();
        sb.AppendLine("You have access to the following tools. USE THEM ACTIVELY when relevant to the user's request:");
        sb.AppendLine();

        // List tool names explicitly so the model knows exactly what to call
        if (_pluginMethods.Count > 0)
        {
            sb.AppendLine("### Tool Functions You Can Call:");
            foreach (var toolName in _pluginMethods.Keys.OrderBy(k => k))
            {
                sb.AppendLine($"- **{toolName}**");
            }
            sb.AppendLine();
        }

        // Add built-in tools if enabled
        if (session.Options.EnableGrokWebSearch || session.Options.EnableGrokXSearch)
        {
            sb.AppendLine("### Built-in Search Tools:");
            if (session.Options.EnableGrokWebSearch)
            {
                sb.AppendLine("- **web_search** - Search the web for current information");
            }
            if (session.Options.EnableGrokXSearch)
            {
                sb.AppendLine("- **x_search** - Search X (Twitter) for posts and discussions");
            }
            sb.AppendLine();
        }

        sb.AppendLine("### Tool Usage Instructions:");

        foreach (var capabilityId in session.Options.Capabilities)
        {
            if (_plugins.TryGetValue(capabilityId, out var plugin))
            {
                sb.AppendLine();
                sb.AppendLine(plugin.GetSystemPromptAddition());
            }
        }

        sb.AppendLine();
        sb.AppendLine("### IMPORTANT: When to Use Each Tool");
        sb.AppendLine();
        sb.AppendLine("**SemanticSearch** - Use for finding notes by meaning/concept:");
        sb.AppendLine("  - \"What do my notes say about...\"");
        sb.AppendLine("  - \"Find information about...\"");
        sb.AppendLine("  - \"Do I have notes on...\"");
        sb.AppendLine("  - \"Search my notes for...\"");
        sb.AppendLine();
        sb.AppendLine("**SearchNotes** - Use for keyword/exact text search:");
        sb.AppendLine("  - \"Find notes with the word...\"");
        sb.AppendLine("  - \"Look for notes titled...\"");
        sb.AppendLine();
        sb.AppendLine("**CreateNote** - Use when user wants to save/remember something:");
        sb.AppendLine("  - \"Create a note about...\"");
        sb.AppendLine("  - \"Save this as a note...\"");
        sb.AppendLine("  - \"Remember that...\" (create note for them)");
        sb.AppendLine();
        sb.AppendLine("**GetNote** - Use to read full note content after finding via search");
        sb.AppendLine();
        sb.AppendLine("**UpdateNote/AppendToNote** - Use to modify existing notes");
        sb.AppendLine();
        sb.AppendLine("### CRITICAL RULES");
        sb.AppendLine("1. ALWAYS call a search tool when the user asks about their notes");
        sb.AppendLine("2. NEVER say \"I don't have access to your notes\" - you DO through these tools");
        sb.AppendLine("3. If you're unsure what the user has, USE SemanticSearch to find out");
        sb.AppendLine("4. After search, summarize what you found or use GetNote for full details");

        return sb.ToString();
    }

    private static string GetDefaultSystemPrompt(bool hasNoteTools)
    {
        if (hasNoteTools)
        {
            return @"You are a helpful voice assistant with access to the user's personal notes system.
You can search, create, update, and manage their notes. When the user asks about their notes or wants to save information, USE YOUR TOOLS.
Keep your responses concise and conversational. Use natural language and avoid technical jargon unless asked.
Respond in a friendly, helpful manner.

CRITICAL: You have note management tools. When the user asks about their notes, USE the search tools. Do not claim you cannot access their notes.";
        }

        return @"You are a helpful voice assistant. Keep your responses concise and conversational.
When speaking, use natural language and avoid technical jargon unless asked.
You have access to web search and X (Twitter) search to find current information.
Respond in a friendly, helpful manner.";
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        await DisconnectAsync();
        GC.SuppressFinalize(this);
    }
}
