namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Extracts thinking/reasoning blocks from AI model responses.
/// </summary>
public class ThinkingExtractor : IThinkingExtractor
{
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
}
