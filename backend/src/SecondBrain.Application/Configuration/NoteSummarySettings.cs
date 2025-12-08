namespace SecondBrain.Application.Configuration;

/// <summary>
/// Configuration settings for the AI-powered note summary feature.
/// Summaries are generated from title, tags, and content to optimize list endpoint performance.
/// </summary>
public class NoteSummarySettings
{
    public const string SectionName = "NoteSummary";

    /// <summary>
    /// Whether note summary generation is enabled.
    /// When disabled, summaries will not be generated and list endpoints will return null for summary field.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// The AI provider to use for generating summaries.
    /// Options: "OpenAI", "Anthropic", "Gemini", "Ollama", "XAI"
    /// Default: "OpenAI" (gpt-4o-mini is fast and cost-effective)
    /// </summary>
    public string Provider { get; set; } = "OpenAI";

    /// <summary>
    /// The specific model to use for summary generation.
    /// Should be a fast, cost-effective model.
    /// Default: "gpt-4o-mini"
    /// </summary>
    public string Model { get; set; } = "gpt-4o-mini";

    /// <summary>
    /// Maximum tokens to generate for the summary.
    /// Keep low for concise summaries (1-2 sentences).
    /// </summary>
    public int MaxTokens { get; set; } = 150;

    /// <summary>
    /// Temperature for summary generation.
    /// Lower values (0.1-0.3) produce more deterministic, focused summaries.
    /// </summary>
    public float Temperature { get; set; } = 0.3f;

    /// <summary>
    /// Maximum character length of the generated summary.
    /// Summaries exceeding this will be truncated.
    /// </summary>
    public int MaxSummaryLength { get; set; } = 500;

    /// <summary>
    /// Maximum character length of note content to include in the prompt.
    /// Longer notes will be truncated to fit the context window.
    /// </summary>
    public int MaxInputContentLength { get; set; } = 4000;

    /// <summary>
    /// Whether to generate summaries when notes are created.
    /// </summary>
    public bool GenerateOnCreate { get; set; } = true;

    /// <summary>
    /// Whether to regenerate summaries when notes are updated.
    /// </summary>
    public bool GenerateOnUpdate { get; set; } = true;

    /// <summary>
    /// Whether to generate summaries in a background task (fire-and-forget).
    /// When true: Fast saves, but summary may be briefly null.
    /// When false: Slower saves, but summary is always available immediately.
    /// </summary>
    public bool BackgroundGeneration { get; set; } = false;

    /// <summary>
    /// Minimum content change ratio (0.0-1.0) required to trigger summary regeneration on update.
    /// For example, 0.3 means regenerate if content changed by more than 30%.
    /// Only applies when GenerateOnUpdate is true.
    /// </summary>
    public float RegenerateThreshold { get; set; } = 0.1f;

    /// <summary>
    /// Timeout in seconds for summary generation requests.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}
