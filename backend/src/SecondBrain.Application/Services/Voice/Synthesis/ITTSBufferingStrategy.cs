using System.Text;

namespace SecondBrain.Application.Services.Voice.Synthesis;

/// <summary>
/// Strategy for buffering text tokens before sending to TTS
/// </summary>
public interface ITTSBufferingStrategy
{
    /// <summary>
    /// Process a token and determine if the buffer should be sent
    /// </summary>
    /// <param name="buffer">Current buffer (may be modified)</param>
    /// <param name="token">New token to process</param>
    /// <returns>Result indicating whether to send and if it's a sentence end</returns>
    BufferResult ProcessToken(StringBuilder buffer, string token);

    /// <summary>
    /// Get remaining buffer content for final flush
    /// </summary>
    /// <param name="buffer">The buffer to flush</param>
    /// <returns>Content to send, or null if buffer is empty</returns>
    string? GetFlushContent(StringBuilder buffer);
}

/// <summary>
/// Result of processing a token through the buffering strategy
/// </summary>
public record BufferResult(bool ShouldSend, bool IsSentenceEnd, string? ContentToSend);
