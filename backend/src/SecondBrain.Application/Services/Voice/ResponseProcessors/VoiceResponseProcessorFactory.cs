using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice.ResponseProcessors;

/// <summary>
/// Factory for creating voice response processors based on session configuration
/// </summary>
public class VoiceResponseProcessorFactory : IVoiceResponseProcessorFactory
{
    private readonly IEnumerable<IVoiceResponseProcessor> _processors;
    private readonly ILogger<VoiceResponseProcessorFactory> _logger;

    public VoiceResponseProcessorFactory(
        IEnumerable<IVoiceResponseProcessor> processors,
        ILogger<VoiceResponseProcessorFactory> logger)
    {
        _processors = processors;
        _logger = logger;
    }

    public IVoiceResponseProcessor GetProcessor(VoiceSession session)
    {
        var processor = _processors.FirstOrDefault(p => p.CanHandle(session));

        if (processor == null)
        {
            _logger.LogWarning(
                "No processor found for session {SessionId} with AgentEnabled={AgentEnabled}. Using first available.",
                session.Id, session.Options.AgentEnabled);

            processor = _processors.First();
        }

        _logger.LogDebug(
            "Selected {ProcessorType} processor for session {SessionId}",
            processor.ProcessorType, session.Id);

        return processor;
    }

    public IEnumerable<string> GetAvailableProcessors()
    {
        return _processors.Select(p => p.ProcessorType);
    }
}
