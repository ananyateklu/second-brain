using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Voice.Formatting;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;
using SecondBrain.Application.Services.Voice.Synthesis;

namespace SecondBrain.Application.Services.Voice.ResponseProcessors;

/// <summary>
/// Processes voice responses using agent mode with tools and RAG
/// </summary>
public class AgentResponseProcessor : IVoiceResponseProcessor
{
    private readonly IAgentService _agentService;
    private readonly IVoiceSessionManager _sessionManager;
    private readonly IVoiceAnnouncementService _announcementService;
    private readonly ITTSBufferingStrategy _bufferingStrategy;
    private readonly VoiceSettings _voiceSettings;
    private readonly ILogger<AgentResponseProcessor> _logger;

    public AgentResponseProcessor(
        IAgentService agentService,
        IVoiceSessionManager sessionManager,
        IVoiceAnnouncementService announcementService,
        ITTSBufferingStrategy bufferingStrategy,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<AgentResponseProcessor> logger)
    {
        _agentService = agentService;
        _sessionManager = sessionManager;
        _announcementService = announcementService;
        _bufferingStrategy = bufferingStrategy;
        _voiceSettings = voiceSettings.Value;
        _logger = logger;
    }

    public string ProcessorType => "Agent";

    public bool CanHandle(VoiceSession session)
    {
        return session.Options.AgentEnabled && _voiceSettings.Features.EnableAgentMode;
    }

    public async Task ProcessAsync(
        VoiceSession session,
        string userText,
        IVoiceEventEmitter eventEmitter,
        ITTSOrchestrator ttsOrchestrator,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing voice input with agent for session {SessionId}", session.Id);

        // Send AI response start event
        await eventEmitter.SendAiResponseStartAsync(cancellationToken);

        // Build AgentRequest from session
        var agentRequest = BuildAgentRequest(session, userText);

        // Initialize TTS options (lazy initialization - session created on first text)
        var synthOptions = new SynthesisOptions
        {
            VoiceId = session.VoiceId,
            Model = _voiceSettings.ElevenLabs.Model,
            Stability = _voiceSettings.ElevenLabs.Stability,
            SimilarityBoost = _voiceSettings.ElevenLabs.SimilarityBoost,
            OutputFormat = _voiceSettings.ElevenLabs.OutputFormat
        };

        await ttsOrchestrator.InitializeAsync(synthOptions, eventEmitter, session.Id);

        // Stream agent response
        var responseBuilder = new StringBuilder();
        var ttsBuffer = new StringBuilder(); // Separate buffer for TTS - excludes thinking content
        var isInsideThinking = false;
        var hasExitedThinking = false;
        var hasAnnouncedThinking = false;
        var receivedNativeThinkingEvent = false;
        int? inputTokens = null;
        int? outputTokens = null;

        await foreach (var evt in _agentService.ProcessStreamAsync(agentRequest, cancellationToken))
        {
            switch (evt.Type)
            {
                case AgentEventType.Status:
                    await eventEmitter.SendAgentStatusAsync(evt.Content ?? "", cancellationToken);
                    break;

                case AgentEventType.ContextRetrieval:
                    await eventEmitter.SendContextRetrievalAsync(evt, cancellationToken);
                    var ragAnnouncement = _announcementService.GetRagAnnouncement(evt.RetrievedNotes?.Count ?? 0);
                    await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
                    await ttsOrchestrator.SpeakImmediatelyAsync(ragAnnouncement, cancellationToken);
                    break;

                case AgentEventType.ToolCallStart:
                    await eventEmitter.SendToolCallStartAsync(evt.ToolId, evt.ToolName, evt.ToolArguments, cancellationToken);
                    var toolAnnouncement = _announcementService.GetToolStartAnnouncement(evt.ToolName);
                    await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
                    await ttsOrchestrator.SpeakImmediatelyAsync(toolAnnouncement, cancellationToken);
                    break;

                case AgentEventType.ToolCallEnd:
                    await eventEmitter.SendToolCallEndAsync(evt.ToolId, evt.ToolName, evt.ToolResult, cancellationToken);
                    break;

                case AgentEventType.Thinking:
                    isInsideThinking = true;
                    receivedNativeThinkingEvent = true;
                    await eventEmitter.SendThinkingStepAsync(evt.Content ?? "", cancellationToken);
                    // Speak "Thinking" once instead of full content
                    if (!hasAnnouncedThinking)
                    {
                        hasAnnouncedThinking = true;
                        await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
                        await ttsOrchestrator.SpeakImmediatelyAsync(_announcementService.GetThinkingAnnouncement(), cancellationToken);
                    }
                    break;

                case AgentEventType.Grounding:
                    await eventEmitter.SendGroundingSourcesAsync(evt, cancellationToken);
                    break;

                case AgentEventType.Token:
                    responseBuilder.Append(evt.Content);

                    // Send text chunk to frontend for real-time transcript display
                    await eventEmitter.SendAiResponseChunkAsync(
                        evt.Content ?? "",
                        responseBuilder.ToString(),
                        cancellationToken);

                    // Track thinking state - don't initialize TTS during thinking
                    var tokenContent = evt.Content ?? "";
                    var wasInsideThinking = isInsideThinking;

                    // Check for thinking start tag
                    if (tokenContent.Contains("<thinking>") || tokenContent.Contains("<thinking"))
                    {
                        isInsideThinking = true;
                        hasExitedThinking = false;
                        _logger.LogDebug("Entered thinking block - deferring TTS initialization");
                        if (!hasAnnouncedThinking)
                        {
                            hasAnnouncedThinking = true;
                            await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
                            await ttsOrchestrator.SpeakImmediatelyAsync(_announcementService.GetThinkingAnnouncement(), cancellationToken);
                        }
                    }

                    // Check for thinking end tag
                    if (!hasExitedThinking && (tokenContent.Contains("</thinking>") || tokenContent.Contains("</thinking")))
                    {
                        isInsideThinking = false;
                        hasExitedThinking = true;
                        ttsBuffer.Clear();
                        _logger.LogDebug("Exited thinking block - TTS buffer cleared");
                    }

                    // Handle native thinking providers
                    var justExitedNativeThinking = false;
                    if (receivedNativeThinkingEvent && isInsideThinking && !hasExitedThinking)
                    {
                        var hasThinkingTags = tokenContent.Contains("<thinking") || tokenContent.Contains("</thinking");
                        if (!hasThinkingTags)
                        {
                            isInsideThinking = false;
                            hasExitedThinking = true;
                            justExitedNativeThinking = true;
                            ttsBuffer.Clear();
                            _logger.LogDebug("Native thinking ended - first non-thinking token received");
                        }
                    }

                    // Only process TTS if not inside thinking
                    if ((!isInsideThinking && !wasInsideThinking) || justExitedNativeThinking)
                    {
                        var cleanContent = _announcementService.StripThinkingTags(tokenContent);
                        if (!string.IsNullOrEmpty(cleanContent))
                        {
                            await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);

                            var result = _bufferingStrategy.ProcessToken(ttsBuffer, cleanContent);
                            if (result.ShouldSend && result.ContentToSend != null && ttsOrchestrator.IsConnected)
                            {
                                await ttsOrchestrator.SendTextAsync(result.ContentToSend, result.IsSentenceEnd, cancellationToken);
                            }
                        }
                    }
                    break;

                case AgentEventType.Error:
                    _logger.LogError("Agent error for session {SessionId}: {Error}", session.Id, evt.Content);
                    await eventEmitter.SendErrorAsync(
                        VoiceErrorCodes.AiProviderFailed,
                        evt.Content ?? "Agent error occurred",
                        recoverable: true,
                        cancellationToken);
                    await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
                    await ttsOrchestrator.SpeakImmediatelyAsync(_announcementService.GetErrorAnnouncement(), cancellationToken);
                    break;

                case AgentEventType.End:
                    inputTokens = evt.InputTokens;
                    outputTokens = evt.OutputTokens;
                    break;
            }
        }

        // Flush remaining text
        _logger.LogInformation(
            "Agent response complete for session {SessionId}. TtsBuffer: {TtsBufferLength} chars, Response: {ResponseLength} chars",
            session.Id, ttsBuffer.Length, responseBuilder.Length);

        var flushContent = _bufferingStrategy.GetFlushContent(ttsBuffer);
        if (flushContent != null)
        {
            await ttsOrchestrator.EnsureConnectedAsync(cancellationToken);
            if (ttsOrchestrator.IsConnected)
            {
                _logger.LogDebug("Sending final TTS buffer ({Length} chars): {Text}", flushContent.Length, flushContent);
                await ttsOrchestrator.SendTextAsync(flushContent, cancellationToken: cancellationToken);
            }
        }

        if (ttsOrchestrator.IsConnected)
        {
            await ttsOrchestrator.FlushAsync(cancellationToken);
        }

        // Add assistant turn
        await _sessionManager.AddTurnAsync(session.Id, new VoiceTurn
        {
            Role = "assistant",
            Content = responseBuilder.ToString(),
            TokenUsage = inputTokens.HasValue || outputTokens.HasValue ? new TokenUsage
            {
                InputTokens = inputTokens ?? 0,
                OutputTokens = outputTokens ?? 0
            } : null
        });

        // Send end metadata
        await eventEmitter.SendAiResponseEndAsync(
            responseBuilder.ToString(),
            inputTokens ?? 0,
            outputTokens ?? 0,
            cancellationToken);

        // Update state to speaking (in case we haven't yet)
        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Speaking);
        await eventEmitter.SendStateAsync(VoiceSessionState.Speaking, cancellationToken: cancellationToken);
    }

    private AgentRequest BuildAgentRequest(VoiceSession session, string userText)
    {
        var messages = new List<AgentMessage>();

        // Add system prompt optimized for voice
        messages.Add(new AgentMessage
        {
            Role = "system",
            Content = _announcementService.GetVoiceAgentSystemPrompt()
        });

        // Add conversation history
        foreach (var turn in session.Turns)
        {
            messages.Add(new AgentMessage
            {
                Role = turn.Role,
                Content = turn.Content
            });
        }

        // Add current user message
        messages.Add(new AgentMessage
        {
            Role = "user",
            Content = userText
        });

        return new AgentRequest
        {
            Provider = session.Provider,
            Model = session.Model,
            Messages = messages,
            UserId = session.UserId,
            Temperature = session.Options.Temperature,
            MaxTokens = session.Options.MaxTokens,
            Capabilities = session.Options.Capabilities.Count > 0
                ? session.Options.Capabilities
                : _voiceSettings.Features.DefaultCapabilities,
            AgentRagEnabled = session.Options.EnableAgentRag
        };
    }
}
