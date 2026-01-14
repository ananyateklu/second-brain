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

            if (!string.IsNullOrEmpty(thinkingContent) && !IsSimilarToEmitted(thinkingContent, alreadyEmitted))
            {
                alreadyEmitted.Add(thinkingContent);
                yield return thinkingContent;
            }

            thinkingStartIndex = thinkingEndIndex + 11;
        }
    }

    /// <summary>
    /// Checks if thinking content is similar to any already emitted thinking.
    /// This prevents duplicate thinking blocks that have the same intent but slightly different wording.
    /// Uses multiple similarity heuristics: exact match, word overlap (Jaccard), and key phrase matching.
    /// Public so strategies can use it for native thinking deduplication.
    /// </summary>
    public static bool IsSimilarToEmitted(string thinkingContent, HashSet<string> alreadyEmitted)
    {
        if (string.IsNullOrWhiteSpace(thinkingContent))
            return true; // Consider empty as already emitted

        // Exact match
        if (alreadyEmitted.Contains(thinkingContent))
            return true;

        // Extract words for comparison
        var newWords = ExtractSignificantWords(thinkingContent);
        if (newWords.Count < 5)
            return false; // Too short to reliably compare

        foreach (var emitted in alreadyEmitted)
        {
            var emittedWords = ExtractSignificantWords(emitted);
            if (emittedWords.Count < 5)
                continue;

            // Calculate containment similarity (handles length-unbalanced blocks)
            // Containment = intersection / min(set1, set2)
            // This catches when the shorter block's content is largely contained in the longer block
            var intersection = newWords.Intersect(emittedWords).Count();
            var smallerCount = Math.Min(newWords.Count, emittedWords.Count);
            var containment = (double)intersection / smallerCount;

            // If 50%+ of words from smaller block are shared, consider similar
            if (containment >= 0.50)
                return true;

            // Also check for key phrase overlap (tool names, action words, entities)
            var newKeyPhrases = ExtractKeyPhrases(thinkingContent);
            var emittedKeyPhrases = ExtractKeyPhrases(emitted);

            if (newKeyPhrases.Count >= 2 && emittedKeyPhrases.Count >= 2)
            {
                var keyPhraseOverlap = newKeyPhrases.Intersect(emittedKeyPhrases).Count();
                var keyPhraseRatio = (double)keyPhraseOverlap / Math.Min(newKeyPhrases.Count, emittedKeyPhrases.Count);

                // If 60%+ key phrase overlap, consider similar
                if (keyPhraseRatio >= 0.60)
                    return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Extracts significant words from content for similarity comparison.
    /// Filters out common stop words and short words.
    /// </summary>
    private static HashSet<string> ExtractSignificantWords(string content)
    {
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "i", "me", "my", "we", "our", "you", "your", "the", "a", "an", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "shall", "can", "to", "of", "in", "for", "on", "with",
            "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below",
            "between", "under", "again", "further", "then", "once", "here", "there", "when", "where",
            "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor",
            "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
            "because", "until", "while", "this", "that", "these", "those", "what", "which", "who",
            "whom", "their", "they", "them", "it", "its", "let", "about", "also", "now", "first",
            "want", "wants", "need", "needs", "like", "user", "asking", "look", "looking", "make",
            "making", "get", "getting", "find", "finding", "use", "using", "going", "start", "help"
        };

        // Split on non-word characters and filter
        var words = Regex.Split(content.ToLowerInvariant(), @"\W+")
            .Where(w => w.Length > 2 && !stopWords.Contains(w))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return words;
    }

    /// <summary>
    /// Extracts key phrases from content: tool names, numbered actions, quoted terms, etc.
    /// </summary>
    private static HashSet<string> ExtractKeyPhrases(string content)
    {
        var keyPhrases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Extract tool/function names (PascalCase or camelCase words)
        var toolNameMatches = Regex.Matches(content, @"\b([A-Z][a-z]+[A-Z][a-zA-Z]*|[a-z]+[A-Z][a-zA-Z]*)\b");
        foreach (Match match in toolNameMatches)
        {
            keyPhrases.Add(match.Value.ToLowerInvariant());
        }

        // Extract quoted terms
        var quotedMatches = Regex.Matches(content, @"""([^""]+)""|'([^']+)'");
        foreach (Match match in quotedMatches)
        {
            var term = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
            if (term.Length > 2)
                keyPhrases.Add(term.ToLowerInvariant());
        }

        // Extract numbered list patterns (1. action, 2. action)
        var numberedMatches = Regex.Matches(content, @"\d+\.\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,3})");
        foreach (Match match in numberedMatches)
        {
            keyPhrases.Add(match.Groups[1].Value.ToLowerInvariant());
        }

        // Extract common action words that indicate intent
        var actionPatterns = new[] { "search", "find", "get", "retrieve", "create", "update", "delete", "edit", "open", "save" };
        foreach (var pattern in actionPatterns)
        {
            if (content.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                keyPhrases.Add(pattern);
        }

        return keyPhrases;
    }

    /// <summary>
    /// Normalizes thinking content for similarity comparison.
    /// </summary>
    private static string NormalizeForComparison(string content)
    {
        // Lowercase, collapse whitespace, remove punctuation variations
        return Regex.Replace(content.ToLowerInvariant(), @"\s+", " ")
            .Replace("their", "")
            .Replace("the", "")
            .Replace("my", "")
            .Replace("'s", "")
            .Trim();
    }

    /// <inheritdoc />
    public static bool SupportsNativeThinking(string provider, string model)
    {
        // Only Anthropic models support native extended thinking
        var isAnthropic = provider.Equals("anthropic", StringComparison.OrdinalIgnoreCase);

        if (!isAnthropic)
            return false;

        return ThinkingCapableModels.Any(m => model.Contains(m, StringComparison.OrdinalIgnoreCase));
    }

    // Instance method for interface compatibility
    bool IThinkingExtractor.SupportsNativeThinking(string provider, string model)
        => SupportsNativeThinking(provider, model);

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
