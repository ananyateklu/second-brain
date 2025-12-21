using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Voice.Formatting;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;
using SecondBrain.Application.Services.Voice.Synthesis;

namespace SecondBrain.Application.Services.Voice.ResponseProcessors;

/// <summary>
/// Processes voice responses using direct AI provider (non-agent mode)
/// </summary>
public class DirectAIResponseProcessor : IVoiceResponseProcessor
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly IVoiceSessionManager _sessionManager;
    private readonly IVoiceAnnouncementService _announcementService;
    private readonly ITTSBufferingStrategy _bufferingStrategy;
    private readonly VoiceSettings _voiceSettings;
    private readonly ILogger<DirectAIResponseProcessor> _logger;

    public DirectAIResponseProcessor(
        IAIProviderFactory aiProviderFactory,
        IVoiceSessionManager sessionManager,
        IVoiceAnnouncementService announcementService,
        ITTSBufferingStrategy bufferingStrategy,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<DirectAIResponseProcessor> logger)
    {
        _aiProviderFactory = aiProviderFactory;
        _sessionManager = sessionManager;
        _announcementService = announcementService;
        _bufferingStrategy = bufferingStrategy;
        _voiceSettings = voiceSettings.Value;
        _logger = logger;
    }

    public string ProcessorType => "DirectAI";

    public bool CanHandle(VoiceSession session)
    {
        return !session.Options.AgentEnabled || !_voiceSettings.Features.EnableAgentMode;
    }

    public async Task ProcessAsync(
        VoiceSession session,
        string userText,
        IVoiceEventEmitter eventEmitter,
        ITTSOrchestrator ttsOrchestrator,
        CancellationToken cancellationToken)
    {
        // Send AI response start event
        await eventEmitter.SendAiResponseStartAsync(cancellationToken);

        var provider = _aiProviderFactory.GetProvider(session.Provider);

        // Build message history
        var messages = new List<ChatMessage>();

        // Add system prompt
        if (!string.IsNullOrEmpty(session.Options.SystemPrompt))
        {
            messages.Add(new ChatMessage
            {
                Role = "system",
                Content = session.Options.SystemPrompt
            });
        }
        else
        {
            messages.Add(new ChatMessage
            {
                Role = "system",
                Content = _announcementService.GetDirectAISystemPrompt()
            });
        }

        // Add conversation history
        foreach (var turn in session.Turns)
        {
            messages.Add(new ChatMessage
            {
                Role = turn.Role,
                Content = turn.Content
            });
        }

        var settings = new AIRequest
        {
            Model = session.Model,
            Temperature = session.Options.Temperature,
            MaxTokens = session.Options.MaxTokens
        };

        // Initialize TTS
        var synthOptions = new SynthesisOptions
        {
            VoiceId = session.VoiceId,
            Model = _voiceSettings.ElevenLabs.Model,
            Stability = _voiceSettings.ElevenLabs.Stability,
            SimilarityBoost = _voiceSettings.ElevenLabs.SimilarityBoost,
            OutputFormat = _voiceSettings.ElevenLabs.OutputFormat
        };

        await ttsOrchestrator.InitializeAsync(synthOptions, eventEmitter, session.Id);

        // Update state to speaking
        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Speaking);
        await eventEmitter.SendStateAsync(VoiceSessionState.Speaking, cancellationToken: cancellationToken);

        // Stream AI response
        var responseBuilder = new StringBuilder();
        var tokenBuffer = new StringBuilder();

        var stream = await provider.StreamChatCompletionAsync(messages, settings, cancellationToken);

        await foreach (var token in stream.WithCancellation(cancellationToken))
        {
            responseBuilder.Append(token);

            // Send text chunk to frontend for real-time transcript display
            await eventEmitter.SendAiResponseChunkAsync(token, responseBuilder.ToString(), cancellationToken);

            // Process token for TTS buffering
            var result = _bufferingStrategy.ProcessToken(tokenBuffer, token);
            if (result.ShouldSend && result.ContentToSend != null && ttsOrchestrator.IsConnected)
            {
                await ttsOrchestrator.SendTextAsync(result.ContentToSend, result.IsSentenceEnd, cancellationToken);
            }
        }

        // Flush remaining text
        var flushContent = _bufferingStrategy.GetFlushContent(tokenBuffer);
        if (flushContent != null && ttsOrchestrator.IsConnected)
        {
            await ttsOrchestrator.SendTextAsync(flushContent, cancellationToken: cancellationToken);
        }

        await ttsOrchestrator.FlushAsync(cancellationToken);

        // Add assistant turn
        await _sessionManager.AddTurnAsync(session.Id, new VoiceTurn
        {
            Role = "assistant",
            Content = responseBuilder.ToString()
        });

        // Send end metadata
        await eventEmitter.SendAiResponseEndAsync(responseBuilder.ToString(), 0, 0, cancellationToken);
    }
}
