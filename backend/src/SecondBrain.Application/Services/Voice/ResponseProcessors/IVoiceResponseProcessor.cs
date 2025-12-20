using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;
using SecondBrain.Application.Services.Voice.Synthesis;

namespace SecondBrain.Application.Services.Voice.ResponseProcessors;

/// <summary>
/// Interface for processing voice responses from AI providers
/// </summary>
public interface IVoiceResponseProcessor
{
    /// <summary>
    /// The type of processor (e.g., "DirectAI", "Agent")
    /// </summary>
    string ProcessorType { get; }

    /// <summary>
    /// Check if this processor can handle the given session
    /// </summary>
    bool CanHandle(VoiceSession session);

    /// <summary>
    /// Process user input and generate AI response with TTS
    /// </summary>
    /// <param name="session">The voice session</param>
    /// <param name="userText">The user's transcribed text</param>
    /// <param name="eventEmitter">Event emitter for WebSocket messages</param>
    /// <param name="ttsOrchestrator">TTS orchestrator for speech synthesis</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ProcessAsync(
        VoiceSession session,
        string userText,
        IVoiceEventEmitter eventEmitter,
        ITTSOrchestrator ttsOrchestrator,
        CancellationToken cancellationToken);
}
