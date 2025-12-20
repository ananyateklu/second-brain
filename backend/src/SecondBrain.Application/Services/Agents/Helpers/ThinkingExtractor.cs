using System.Text.RegularExpressions;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Extracts thinking/reasoning blocks from AI model responses.
/// </summary>
public partial class ThinkingExtractor : IThinkingExtractor
{
    /// <summary>
    /// Source-generated regex for matching thinking blocks (compiled for performance in hot paths).
    /// Matches &lt;thinking&gt;...&lt;/thinking&gt; blocks (case-insensitive, handles multiline).
    /// </summary>
    [GeneratedRegex(@"<thinking>[\s\S]*?</thinking>", RegexOptions.IgnoreCase)]
    private static partial Regex ThinkingTagRegex();

    // Models that support native extended thinking
    private static readonly string[] ThinkingCapableModels = new[]
    {
        "claude-opus-4",
        "claude-sonnet-4",
        "claude-3-7-sonnet",
        "claude-3-5-sonnet"
    };

    /// <inheritdoc />
    public IEnumerable<string> ExtractXmlThinkingBlocks(string content, HashSet<string> alreadyEmitted)
    {
        if (string.IsNullOrEmpty(content))
            yield break;

        var thinkingStartIndex = 0;
        while ((thinkingStartIndex = content.IndexOf("<thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase)) != -1)
        {
            var thinkingEndIndex = content.IndexOf("</thinking>", thinkingStartIndex, StringComparison.OrdinalIgnoreCase);
            if (thinkingEndIndex == -1)
                break;

            var thinkingContent = content.Substring(
                thinkingStartIndex + 10,
                thinkingEndIndex - thinkingStartIndex - 10
            ).Trim();

            if (!string.IsNullOrEmpty(thinkingContent) && !alreadyEmitted.Contains(thinkingContent))
            {
                alreadyEmitted.Add(thinkingContent);
                yield return thinkingContent;
            }

            thinkingStartIndex = thinkingEndIndex + 11;
        }
    }

    /// <inheritdoc />
    public bool SupportsNativeThinking(string provider, string model)
    {
        // Only Anthropic models support native extended thinking
        var isAnthropic = provider.Equals("claude", StringComparison.OrdinalIgnoreCase) ||
                         provider.Equals("anthropic", StringComparison.OrdinalIgnoreCase);

        if (!isAnthropic)
            return false;

        return ThinkingCapableModels.Any(m => model.Contains(m, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Strips complete XML-style thinking blocks from content.
    /// Used to clean token content before sending to TTS (thinking is emitted separately as ThinkingEvent).
    /// </summary>
    /// <param name="content">Content potentially containing thinking blocks</param>
    /// <returns>Content with thinking blocks removed</returns>
    public static string StripThinkingBlocks(string content)
    {
        if (string.IsNullOrEmpty(content))
            return content;

        // Remove complete <thinking>...</thinking> blocks (case-insensitive, handles multiline)
        // Uses source-generated regex for performance in streaming hot paths
        return ThinkingTagRegex().Replace(content, "");
    }

    /// <summary>
    /// Extracts only the speakable (non-thinking) content from accumulated streaming text.
    /// This handles the case where thinking blocks span multiple tokens.
    /// </summary>
    /// <param name="accumulatedContent">The full accumulated content so far</param>
    /// <param name="lastSpeakableLength">Length of content already yielded as speakable (updated by this method)</param>
    /// <returns>New speakable content to yield, or empty if currently inside thinking or no new content</returns>
    public static string ExtractNewSpeakableContent(string accumulatedContent, ref int lastSpeakableLength)
    {
        if (string.IsNullOrEmpty(accumulatedContent))
            return string.Empty;

        // Find all thinking block positions
        var speakableBuilder = new System.Text.StringBuilder();
        var currentPos = 0;

        while (currentPos < accumulatedContent.Length)
        {
            // Find next thinking start
            var thinkingStart = accumulatedContent.IndexOf("<thinking>", currentPos, StringComparison.OrdinalIgnoreCase);

            if (thinkingStart == -1)
            {
                // No more thinking blocks - rest is speakable (but might be incomplete if ends with partial tag)
                var remaining = accumulatedContent.Substring(currentPos);

                // Check if we might be in the middle of a partial <thinking tag
                var partialTagIndex = remaining.LastIndexOf('<');
                if (partialTagIndex >= 0 && partialTagIndex > remaining.Length - 11) // "<thinking>" is 10 chars
                {
                    var possiblePartialTag = remaining.Substring(partialTagIndex);
                    if ("<thinking>".StartsWith(possiblePartialTag, StringComparison.OrdinalIgnoreCase))
                    {
                        // Partial tag detected - don't include it
                        remaining = remaining.Substring(0, partialTagIndex);
                    }
                }

                speakableBuilder.Append(remaining);
                break;
            }

            // Add content before thinking block
            if (thinkingStart > currentPos)
            {
                speakableBuilder.Append(accumulatedContent.Substring(currentPos, thinkingStart - currentPos));
            }

            // Find thinking end
            var thinkingEnd = accumulatedContent.IndexOf("</thinking>", thinkingStart, StringComparison.OrdinalIgnoreCase);

            if (thinkingEnd == -1)
            {
                // Inside an incomplete thinking block - stop here, don't include partial thinking
                break;
            }

            // Move past the thinking block
            currentPos = thinkingEnd + 11; // "</thinking>" is 11 chars
        }

        var fullSpeakable = speakableBuilder.ToString();

        // Return only the NEW speakable content since last yield
        if (fullSpeakable.Length > lastSpeakableLength)
        {
            var newContent = fullSpeakable.Substring(lastSpeakableLength);
            lastSpeakableLength = fullSpeakable.Length;
            return newContent;
        }

        return string.Empty;
    }
}
