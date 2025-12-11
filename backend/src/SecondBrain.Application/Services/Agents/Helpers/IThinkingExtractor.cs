namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Extracts thinking/reasoning blocks from AI model responses.
/// Supports both XML-style thinking tags and native thinking content.
/// </summary>
public interface IThinkingExtractor
{
    /// <summary>
    /// Extract XML-style thinking blocks from content.
    /// Returns only blocks that haven't been emitted yet.
    /// </summary>
    /// <param name="content">The content to search for thinking blocks</param>
    /// <param name="alreadyEmitted">Set of thinking blocks already emitted (to avoid duplicates)</param>
    /// <returns>New thinking blocks found</returns>
    IEnumerable<string> ExtractXmlThinkingBlocks(string content, HashSet<string> alreadyEmitted);

    /// <summary>
    /// Check if the model supports native thinking (e.g., Anthropic extended thinking)
    /// </summary>
    bool SupportsNativeThinking(string provider, string model);
}
