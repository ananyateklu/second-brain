namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Static database of known AI model context window limits.
/// Used as a fallback when providers don't return context information in their API responses.
/// </summary>
public static class ModelContextDatabase
{
    /// <summary>
    /// Default context window for unknown models.
    /// </summary>
    public const int DefaultContextWindow = 8192;

    /// <summary>
    /// Known models with their context window and max output token limits.
    /// Key: model ID prefix, Value: (ContextWindow, MaxOutputTokens)
    /// </summary>
    private static readonly Dictionary<string, (int ContextWindow, int? MaxOutput)> KnownModels = new(StringComparer.OrdinalIgnoreCase)
    {
        // OpenAI Models
        ["gpt-5.1"] = (128000, 16384),
        ["gpt-5"] = (128000, 16384),
        ["gpt-4o"] = (128000, 16384),
        ["gpt-4o-mini"] = (128000, 16384),
        ["gpt-4-turbo"] = (128000, 4096),
        ["gpt-4-turbo-preview"] = (128000, 4096),
        ["gpt-4"] = (8192, 8192),
        ["gpt-4-32k"] = (32768, 32768),
        ["gpt-3.5-turbo"] = (16385, 4096),
        ["gpt-3.5-turbo-16k"] = (16385, 4096),
        ["o1"] = (200000, 100000),
        ["o1-mini"] = (128000, 65536),
        ["o1-preview"] = (128000, 32768),
        ["o3"] = (200000, 100000),
        ["o3-mini"] = (200000, 100000),
        ["o4-mini"] = (200000, 100000),
        ["chatgpt-4o-latest"] = (128000, 16384),
        ["gpt-oss-120b"] = (128000, 16384),
        ["gpt-oss-20b"] = (128000, 16384),

        // Anthropic Claude Models
        // Claude 4.x models
        ["claude-sonnet-4"] = (200000, 8192),
        ["claude-opus-4"] = (200000, 8192),
        ["claude-haiku-4"] = (200000, 8192),
        // Claude 3.7 models
        ["claude-3-7-sonnet"] = (200000, 8192),
        // Claude 3.5 models
        ["claude-3-5-sonnet"] = (200000, 8192),
        ["claude-3-5-haiku"] = (200000, 8192),
        // Claude 3.x models
        ["claude-3-opus"] = (200000, 4096),
        ["claude-3-sonnet"] = (200000, 4096),
        ["claude-3-haiku"] = (200000, 4096),
        // Legacy models
        ["claude-2.1"] = (200000, 4096),
        ["claude-2"] = (100000, 4096),

        // Google Gemini Models
        ["gemini-3-pro"] = (1000000, 8192),
        ["gemini-3"] = (1000000, 8192),
        ["gemini-2.5-pro"] = (1000000, 65536),
        ["gemini-2.5-flash"] = (1000000, 65536),
        ["gemini-2.0-flash"] = (1000000, 8192),
        ["gemini-2.0-flash-exp"] = (1000000, 8192),
        ["gemini-1.5-pro"] = (2000000, 8192),
        ["gemini-1.5-flash"] = (1000000, 8192),
        ["gemini-1.0-pro"] = (32768, 8192),
        ["gemini-pro"] = (32768, 8192),

        // X.AI Grok Models
        ["grok-4"] = (256000, 16384),
        ["grok-3"] = (131072, 16384),
        ["grok-3-mini"] = (131072, 16384),
        ["grok-2"] = (131072, 16384),
        ["grok-beta"] = (131072, 16384),

        // Ollama Models (common defaults)
        ["llama4"] = (256000, null),
        ["llama4-scout"] = (10000000, null),
        ["llama4-maverick"] = (256000, null),
        ["llama3.3"] = (128000, null),
        ["llama3.2"] = (128000, null),
        ["llama3.1"] = (128000, null),
        ["llama3"] = (8192, null),
        ["llama2"] = (4096, null),
        ["mistral"] = (32768, null),
        ["mixtral"] = (32768, null),
        ["codellama"] = (16384, null),
        ["qwen3-max"] = (128000, null),
        ["qwen3"] = (32768, null),
        ["qwen2.5"] = (32768, null),
        ["deepseek-coder"] = (16384, null),
        ["deepseek"] = (64000, null),
        ["phi-4"] = (128000, null),
        ["phi-4-mini"] = (128000, null),
        ["phi-4-mini-flash-reasoning"] = (128000, null),
        ["phi3"] = (128000, null),
        ["gemma2"] = (8192, null),
        ["nomic-embed-text"] = (8192, null),
        ["fara-7b"] = (32768, null),
    };

    /// <summary>
    /// Gets the context window and max output limits for a model.
    /// Supports exact matches and prefix matching for versioned models.
    /// </summary>
    /// <param name="modelId">The model identifier (e.g., "gpt-4o-2024-08-06")</param>
    /// <returns>Tuple of (ContextWindow, MaxOutputTokens). Null values indicate unknown limits.</returns>
    public static (int? ContextWindow, int? MaxOutput) GetModelLimits(string modelId)
    {
        if (string.IsNullOrWhiteSpace(modelId))
        {
            return (DefaultContextWindow, null);
        }

        // Try exact match first
        if (KnownModels.TryGetValue(modelId, out var exactMatch))
        {
            return exactMatch;
        }

        // Try prefix matching for versioned models (e.g., "gpt-4o-2024-08-06" -> "gpt-4o")
        foreach (var (key, value) in KnownModels)
        {
            if (modelId.StartsWith(key, StringComparison.OrdinalIgnoreCase))
            {
                return value;
            }
        }

        // Try matching model families with contains (for less common naming patterns)
        var normalizedModel = modelId.ToLowerInvariant();

        // OpenAI family matching
        if (normalizedModel.Contains("gpt-5")) return KnownModels["gpt-5"];
        if (normalizedModel.Contains("gpt-4o")) return KnownModels["gpt-4o"];
        if (normalizedModel.Contains("gpt-4-turbo")) return KnownModels["gpt-4-turbo"];
        if (normalizedModel.Contains("gpt-4")) return KnownModels["gpt-4"];
        if (normalizedModel.Contains("gpt-3.5")) return KnownModels["gpt-3.5-turbo"];

        // Claude family matching
        if (normalizedModel.Contains("claude-sonnet-4") || normalizedModel.Contains("claude-4-sonnet")) return KnownModels["claude-sonnet-4"];
        if (normalizedModel.Contains("claude-opus-4") || normalizedModel.Contains("claude-4-opus")) return KnownModels["claude-opus-4"];
        if (normalizedModel.Contains("claude-haiku-4") || normalizedModel.Contains("claude-4-haiku")) return KnownModels["claude-haiku-4"];
        if (normalizedModel.Contains("claude-3-7-sonnet") || normalizedModel.Contains("claude-3.7")) return KnownModels["claude-3-7-sonnet"];
        if (normalizedModel.Contains("claude-3-5-sonnet")) return KnownModels["claude-3-5-sonnet"];
        if (normalizedModel.Contains("claude-3-5-haiku")) return KnownModels["claude-3-5-haiku"];
        if (normalizedModel.Contains("claude-3")) return KnownModels["claude-3-sonnet"];
        if (normalizedModel.Contains("claude")) return KnownModels["claude-2.1"];

        // Gemini family matching
        if (normalizedModel.Contains("gemini-3")) return KnownModels["gemini-3-pro"];
        if (normalizedModel.Contains("gemini-2.5")) return KnownModels["gemini-2.5-flash"];
        if (normalizedModel.Contains("gemini-2")) return KnownModels["gemini-2.0-flash"];
        if (normalizedModel.Contains("gemini-1.5")) return KnownModels["gemini-1.5-flash"];
        if (normalizedModel.Contains("gemini")) return KnownModels["gemini-pro"];

        // Grok family matching
        if (normalizedModel.Contains("grok-4")) return KnownModels["grok-4"];
        if (normalizedModel.Contains("grok")) return KnownModels["grok-3"];

        // Ollama family matching
        if (normalizedModel.Contains("llama4-scout")) return KnownModels["llama4-scout"];
        if (normalizedModel.Contains("llama4")) return KnownModels["llama4"];
        if (normalizedModel.Contains("llama3.3")) return KnownModels["llama3.3"];
        if (normalizedModel.Contains("llama3.2")) return KnownModels["llama3.2"];
        if (normalizedModel.Contains("llama3.1")) return KnownModels["llama3.1"];
        if (normalizedModel.Contains("llama3")) return KnownModels["llama3"];
        if (normalizedModel.Contains("llama")) return KnownModels["llama2"];
        if (normalizedModel.Contains("mistral") || normalizedModel.Contains("mixtral")) return KnownModels["mistral"];
        if (normalizedModel.Contains("qwen3-max")) return KnownModels["qwen3-max"];
        if (normalizedModel.Contains("qwen")) return KnownModels["qwen2.5"];
        if (normalizedModel.Contains("phi-4")) return KnownModels["phi-4"];
        if (normalizedModel.Contains("phi")) return KnownModels["phi3"];
        if (normalizedModel.Contains("deepseek")) return KnownModels["deepseek"];

        // Default fallback
        return (DefaultContextWindow, null);
    }

    /// <summary>
    /// Creates an AIModelInfo object for a model ID, enriching it with known context limits.
    /// </summary>
    /// <param name="modelId">The model identifier</param>
    /// <param name="displayName">Optional display name for the model</param>
    /// <returns>AIModelInfo with context window information if known</returns>
    public static AIModelInfo CreateModelInfo(string modelId, string? displayName = null)
    {
        var (contextWindow, maxOutput) = GetModelLimits(modelId);
        return new AIModelInfo
        {
            Id = modelId,
            DisplayName = displayName,
            ContextWindow = contextWindow,
            MaxOutputTokens = maxOutput
        };
    }
}
