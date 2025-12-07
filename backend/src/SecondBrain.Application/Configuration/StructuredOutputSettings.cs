namespace SecondBrain.Application.Configuration;

/// <summary>
/// Configuration for structured output service across all AI providers.
/// </summary>
public class StructuredOutputSettings
{
    public const string SectionName = "StructuredOutput";

    /// <summary>
    /// Default provider to use when no provider is specified.
    /// Options: "OpenAI", "Anthropic", "Gemini", "Grok", "Ollama"
    /// </summary>
    public string DefaultProvider { get; set; } = "Gemini";

    /// <summary>
    /// Default temperature for structured output generation.
    /// Lower values (0.0-0.3) are recommended for consistent structured output.
    /// </summary>
    public float DefaultTemperature { get; set; } = 0.1f;

    /// <summary>
    /// Provider-specific settings for structured output.
    /// </summary>
    public StructuredOutputProvidersConfig Providers { get; set; } = new();
}

/// <summary>
/// Provider-specific configuration for structured output.
/// </summary>
public class StructuredOutputProvidersConfig
{
    public StructuredOutputProviderConfig OpenAI { get; set; } = new()
    {
        Enabled = true,
        Model = "gpt-4o"
    };

    public StructuredOutputProviderConfig Anthropic { get; set; } = new()
    {
        Enabled = true,
        Model = "claude-3-5-sonnet-20241022"
    };

    public StructuredOutputProviderConfig Gemini { get; set; } = new()
    {
        Enabled = true,
        Model = "gemini-2.0-flash"
    };

    public StructuredOutputProviderConfig Grok { get; set; } = new()
    {
        Enabled = true,
        Model = "grok-3-mini"
    };

    public StructuredOutputProviderConfig Ollama { get; set; } = new()
    {
        Enabled = true,
        Model = "qwen3:4b"
    };
}

/// <summary>
/// Configuration for a single structured output provider.
/// </summary>
public class StructuredOutputProviderConfig
{
    /// <summary>
    /// Whether this provider is enabled for structured output.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Default model to use for structured output from this provider.
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Optional: Custom temperature override for this provider.
    /// </summary>
    public float? Temperature { get; set; }

    /// <summary>
    /// Optional: Maximum tokens for this provider.
    /// </summary>
    public int? MaxTokens { get; set; }
}
