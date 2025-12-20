using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice.ResponseProcessors;

/// <summary>
/// Factory for creating voice response processors
/// </summary>
public interface IVoiceResponseProcessorFactory
{
    /// <summary>
    /// Get the appropriate processor for the given session
    /// </summary>
    IVoiceResponseProcessor GetProcessor(VoiceSession session);

    /// <summary>
    /// Get all available processor types
    /// </summary>
    IEnumerable<string> GetAvailableProcessors();
}
