using System.Net.WebSockets;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice.Orchestration;

/// <summary>
/// Interface for orchestrating voice WebSocket sessions
/// </summary>
public interface IVoiceOrchestrator
{
    /// <summary>
    /// Run the voice session WebSocket loop
    /// </summary>
    /// <param name="webSocket">The WebSocket connection</param>
    /// <param name="session">The voice session</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RunAsync(WebSocket webSocket, VoiceSession session, CancellationToken cancellationToken);
}
