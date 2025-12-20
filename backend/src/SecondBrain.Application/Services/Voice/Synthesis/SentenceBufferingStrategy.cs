using System.Text;

namespace SecondBrain.Application.Services.Voice.Synthesis;

/// <summary>
/// Buffers tokens and sends at sentence boundaries for natural TTS speech
/// </summary>
public class SentenceBufferingStrategy : ITTSBufferingStrategy
{
    private const int LongBufferThreshold = 150;
    private const int MaxBufferThreshold = 250;

    public BufferResult ProcessToken(StringBuilder buffer, string token)
    {
        buffer.Append(token);
        var bufferText = buffer.ToString();

        var shouldSend = false;
        var isSentenceEnd = false;

        // Check for sentence-ending punctuation (natural pause points)
        if (token.EndsWith('.') || token.EndsWith('!') || token.EndsWith('?'))
        {
            shouldSend = true;
            isSentenceEnd = true;
        }
        // Colon and semicolon are minor pauses
        else if (token.EndsWith(':') || token.EndsWith(';'))
        {
            shouldSend = true;
        }
        // For longer buffers, send at natural word boundaries
        else if (bufferText.Length > LongBufferThreshold &&
                 (bufferText.EndsWith(", ") || bufferText.EndsWith("— ") ||
                  bufferText.EndsWith("- ") || token == " "))
        {
            shouldSend = true;
        }
        // Safety limit: send very long buffers at word boundaries
        else if (bufferText.Length > MaxBufferThreshold && token.EndsWith(" "))
        {
            shouldSend = true;
        }

        if (shouldSend && buffer.Length > 0)
        {
            var content = bufferText;
            buffer.Clear();
            return new BufferResult(true, isSentenceEnd, content);
        }

        return new BufferResult(false, false, null);
    }

    public string? GetFlushContent(StringBuilder buffer)
    {
        if (buffer.Length == 0)
            return null;

        var content = buffer.ToString();
        buffer.Clear();
        return content;
    }
}
