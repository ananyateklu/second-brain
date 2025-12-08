using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service for generating AI-powered note summaries.
/// Uses configurable AI provider to generate concise summaries from note title, tags, and content.
/// </summary>
public class NoteSummaryService : INoteSummaryService
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly NoteSummarySettings _settings;
    private readonly ILogger<NoteSummaryService> _logger;

    public NoteSummaryService(
        IAIProviderFactory aiProviderFactory,
        IOptions<NoteSummarySettings> settings,
        ILogger<NoteSummaryService> logger)
    {
        _aiProviderFactory = aiProviderFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public bool IsEnabled => _settings.Enabled;

    /// <inheritdoc />
    public async Task<string?> GenerateSummaryAsync(
        string title,
        string content,
        List<string> tags,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            _logger.LogDebug("Note summary generation is disabled");
            return null;
        }

        // Skip empty or very short content
        if (string.IsNullOrWhiteSpace(content) && string.IsNullOrWhiteSpace(title))
        {
            _logger.LogDebug("Skipping summary generation for empty note");
            return null;
        }

        try
        {
            var provider = _aiProviderFactory.GetProvider(_settings.Provider);
            if (!provider.IsEnabled)
            {
                _logger.LogWarning(
                    "Configured summary provider '{Provider}' is not enabled, falling back to first available",
                    _settings.Provider);

                provider = _aiProviderFactory.GetEnabledProviders().FirstOrDefault()
                    ?? throw new InvalidOperationException("No AI providers are available for summary generation");
            }

            var prompt = BuildSummaryPrompt(title, content, tags);

            _logger.LogDebug(
                "Generating summary using provider {Provider}, model {Model}",
                provider.ProviderName,
                _settings.Model);

            var request = new AIRequest
            {
                Prompt = prompt,
                Model = _settings.Model,
                MaxTokens = _settings.MaxTokens,
                Temperature = _settings.Temperature
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));

            var response = await provider.GenerateCompletionAsync(request, cts.Token);

            if (!response.Success)
            {
                _logger.LogWarning(
                    "Summary generation failed: {Error}",
                    response.Error);
                return null;
            }

            var summary = CleanSummary(response.Content);

            // Truncate if necessary
            if (summary.Length > _settings.MaxSummaryLength)
            {
                summary = summary[.._settings.MaxSummaryLength].TrimEnd() + "...";
            }

            _logger.LogDebug(
                "Generated summary ({Length} chars) for note: {Title}",
                summary.Length,
                title);

            return summary;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Summary generation timed out after {Timeout}s", _settings.TimeoutSeconds);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating summary for note: {Title}", title);
            return null;
        }
    }

    /// <inheritdoc />
    public bool ShouldRegenerateSummary(
        string? oldContent,
        string? newContent,
        string? oldTitle,
        string? newTitle,
        List<string>? oldTags,
        List<string>? newTags)
    {
        if (!_settings.Enabled || !_settings.GenerateOnUpdate)
        {
            return false;
        }

        // Always regenerate if title changed
        if (!string.Equals(oldTitle, newTitle, StringComparison.Ordinal))
        {
            _logger.LogDebug("Title changed, will regenerate summary");
            return true;
        }

        // Check if tags changed
        var oldTagSet = new HashSet<string>(oldTags ?? [], StringComparer.OrdinalIgnoreCase);
        var newTagSet = new HashSet<string>(newTags ?? [], StringComparer.OrdinalIgnoreCase);
        if (!oldTagSet.SetEquals(newTagSet))
        {
            _logger.LogDebug("Tags changed, will regenerate summary");
            return true;
        }

        // Check content change ratio
        if (string.IsNullOrEmpty(oldContent) && !string.IsNullOrEmpty(newContent))
        {
            return true;
        }

        if (!string.IsNullOrEmpty(oldContent) && !string.IsNullOrEmpty(newContent))
        {
            var changeRatio = CalculateChangeRatio(oldContent, newContent);
            if (changeRatio >= _settings.RegenerateThreshold)
            {
                _logger.LogDebug(
                    "Content change ratio {Ratio:P2} exceeds threshold {Threshold:P2}, will regenerate summary",
                    changeRatio,
                    _settings.RegenerateThreshold);
                return true;
            }
        }

        return false;
    }

    private string BuildSummaryPrompt(string title, string content, List<string> tags)
    {
        var truncatedContent = TruncateContent(content, _settings.MaxInputContentLength);
        var tagsString = tags.Count > 0 ? string.Join(", ", tags) : "none";

        return $"""
            Generate a concise 1-2 sentence summary of this note. The summary should:
            - Capture the main topic and key points
            - Be specific and informative (avoid generic descriptions)
            - Consider the title, tags, and content for full context
            - Be suitable for display in a list view

            Title: {title}
            Tags: {tagsString}
            Content:
            {truncatedContent}

            Summary:
            """;
    }

    private static string TruncateContent(string content, int maxLength)
    {
        if (string.IsNullOrEmpty(content))
        {
            return string.Empty;
        }

        if (content.Length <= maxLength)
        {
            return content;
        }

        // Try to truncate at a sentence boundary
        var truncated = content[..maxLength];
        var lastSentenceEnd = truncated.LastIndexOfAny(['.', '!', '?']);

        if (lastSentenceEnd > maxLength / 2)
        {
            return truncated[..(lastSentenceEnd + 1)] + "\n[Content truncated...]";
        }

        // Fall back to word boundary
        var lastSpace = truncated.LastIndexOf(' ');
        if (lastSpace > maxLength / 2)
        {
            return truncated[..lastSpace] + "...\n[Content truncated...]";
        }

        return truncated + "...\n[Content truncated...]";
    }

    private static string CleanSummary(string summary)
    {
        if (string.IsNullOrWhiteSpace(summary))
        {
            return string.Empty;
        }

        // Remove common AI response prefixes
        var cleaned = summary.Trim();

        var prefixesToRemove = new[]
        {
            "Summary:",
            "Here is a summary:",
            "Here's a summary:",
            "The summary is:",
            "This note is about",
            "This note discusses",
        };

        foreach (var prefix in prefixesToRemove)
        {
            if (cleaned.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned[prefix.Length..].TrimStart();
            }
        }

        return cleaned;
    }

    private static float CalculateChangeRatio(string oldText, string newText)
    {
        // Simple Levenshtein-based change ratio estimation
        // For performance, we use a simplified approach based on length difference
        // and character overlap

        var maxLength = Math.Max(oldText.Length, newText.Length);
        if (maxLength == 0)
        {
            return 0f;
        }

        // Quick check: if lengths are very different, likely significant change
        var lengthDiff = Math.Abs(oldText.Length - newText.Length);
        var lengthRatio = (float)lengthDiff / maxLength;

        if (lengthRatio > 0.5f)
        {
            return lengthRatio;
        }

        // Character-level comparison (simplified)
        var oldChars = new HashSet<char>(oldText);
        var newChars = new HashSet<char>(newText);

        var intersection = oldChars.Intersect(newChars).Count();
        var union = oldChars.Union(newChars).Count();

        if (union == 0)
        {
            return 0f;
        }

        // Jaccard distance
        var similarity = (float)intersection / union;
        return 1f - similarity;
    }
}
