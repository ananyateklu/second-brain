namespace SecondBrain.Application.Configuration;

/// <summary>
/// Settings for Focus AI suggestion and summary services
/// </summary>
public class FocusAISettings
{
    public const string SectionName = "FocusAI";

    /// <summary>
    /// Whether AI features are enabled for Focus
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// AI provider to use (e.g., "OpenAI", "Anthropic", "Gemini")
    /// </summary>
    public string Provider { get; set; } = "OpenAI";

    /// <summary>
    /// Model to use for suggestions
    /// </summary>
    public string SuggestionModel { get; set; } = "gpt-4o-mini";

    /// <summary>
    /// Model to use for summaries
    /// </summary>
    public string SummaryModel { get; set; } = "gpt-4o-mini";

    /// <summary>
    /// Max tokens for suggestion responses
    /// </summary>
    public int SuggestionMaxTokens { get; set; } = 800;

    /// <summary>
    /// Max tokens for summary responses
    /// </summary>
    public int SummaryMaxTokens { get; set; } = 500;

    /// <summary>
    /// Temperature for suggestion generation (higher = more creative)
    /// </summary>
    public float SuggestionTemperature { get; set; } = 0.7f;

    /// <summary>
    /// Temperature for summary generation (lower = more factual)
    /// </summary>
    public float SummaryTemperature { get; set; } = 0.3f;

    /// <summary>
    /// Number of notes to retrieve via RAG for suggestions
    /// </summary>
    public int RagTopK { get; set; } = 10;

    /// <summary>
    /// Minimum similarity threshold for RAG retrieval
    /// </summary>
    public float RagSimilarityThreshold { get; set; } = 0.3f;

    /// <summary>
    /// Maximum number of suggestions to return
    /// </summary>
    public int MaxSuggestions { get; set; } = 5;

    /// <summary>
    /// Similarity threshold for deduplication (0-1).
    /// Suggestions with similarity above this threshold are considered duplicates.
    /// </summary>
    public float SuggestionSimilarityThreshold { get; set; } = 0.85f;
}
