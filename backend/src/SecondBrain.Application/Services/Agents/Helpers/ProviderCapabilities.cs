namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Provides runtime detection of provider and model capabilities.
/// Helps strategies determine which features to enable based on provider/model combination.
/// </summary>
public static class ProviderCapabilities
{
    #region Native Thinking/Reasoning Support

    /// <summary>
    /// Determines if a provider/model combination supports native extended thinking.
    /// </summary>
    public static bool SupportsNativeThinking(string provider, string model)
    {
        var providerLower = provider.ToLowerInvariant();
        var modelLower = model.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => IsClaudeThinkingModel(modelLower),
            "gemini" => IsGeminiThinkingModel(modelLower),
            "grok" or "xai" => true, // All Grok models support Think Mode
            "openai" => IsOpenAIReasoningModel(modelLower),
            "ollama" => IsOllamaThinkingModel(modelLower),
            _ => false
        };
    }

    /// <summary>
    /// Determines if Claude model supports extended thinking.
    /// </summary>
    private static bool IsClaudeThinkingModel(string model)
    {
        // Claude 3.5 Sonnet, Claude 3 Opus, Claude 4 models support extended thinking
        return model.Contains("opus") ||
               model.Contains("sonnet-3.5") || model.Contains("sonnet-3-5") ||
               model.Contains("sonnet-4") || model.Contains("claude-4") ||
               model.Contains("opus-4");
    }

    /// <summary>
    /// Determines if Gemini model supports thinking mode.
    /// </summary>
    private static bool IsGeminiThinkingModel(string model)
    {
        // Gemini 2.0+ models support thinking mode
        return model.Contains("2.0") || model.Contains("2.5") ||
               model.Contains("gemini-2") || model.Contains("gemini-3") ||
               model.Contains("flash-thinking") || model.Contains("pro-thinking");
    }

    /// <summary>
    /// Determines if OpenAI model supports reasoning (o1/o3 models).
    /// </summary>
    private static bool IsOpenAIReasoningModel(string model)
    {
        // o1 and o3 series models have reasoning capabilities
        return model.StartsWith("o1") || model.StartsWith("o3") ||
               model.Contains("-o1-") || model.Contains("-o3-");
    }

    /// <summary>
    /// Determines if Ollama model supports thinking mode.
    /// </summary>
    private static bool IsOllamaThinkingModel(string model)
    {
        // Some local models support thinking: DeepSeek-R1, Qwen with thinking
        return model.Contains("deepseek-r1") || model.Contains("deepseek-coder") ||
               model.Contains("qwen") && model.Contains("thinking") ||
               model.Contains("reflection");
    }

    #endregion

    #region Grounding/Search Support

    /// <summary>
    /// Determines if a provider supports grounding (web search, real-time data).
    /// </summary>
    public static bool SupportsGrounding(string provider)
    {
        var providerLower = provider.ToLowerInvariant();
        return providerLower is "gemini" or "grok" or "xai";
    }

    /// <summary>
    /// Determines if a provider supports X/Twitter search (Grok-specific).
    /// </summary>
    public static bool SupportsXSearch(string provider)
    {
        var providerLower = provider.ToLowerInvariant();
        return providerLower is "grok" or "xai";
    }

    #endregion

    #region Code Execution Support

    /// <summary>
    /// Determines if a provider supports code execution (Python sandbox).
    /// </summary>
    public static bool SupportsCodeExecution(string provider)
    {
        var providerLower = provider.ToLowerInvariant();
        return providerLower is "gemini" or "grok" or "xai";
    }

    #endregion

    #region Tool/Function Calling Support

    /// <summary>
    /// Determines if a provider/model supports native function calling.
    /// </summary>
    public static bool SupportsFunctionCalling(string provider, string model)
    {
        var providerLower = provider.ToLowerInvariant();
        var modelLower = model.ToLowerInvariant();

        return providerLower switch
        {
            "openai" => IsOpenAIFunctionCallingModel(modelLower),
            "anthropic" or "claude" => true, // All Claude models support tool use
            "gemini" => true, // All Gemini models support function calling
            "grok" or "xai" => true, // Grok supports OpenAI-compatible function calling
            "ollama" => IsOllamaFunctionCallingModel(modelLower),
            _ => false
        };
    }

    /// <summary>
    /// Determines if OpenAI model supports function calling.
    /// </summary>
    private static bool IsOpenAIFunctionCallingModel(string model)
    {
        // GPT-4, GPT-4o, GPT-3.5-turbo support function calling
        // Reasoning models (o1) have limited function calling support
        return !model.StartsWith("o1") && !model.StartsWith("o3") &&
               (model.Contains("gpt-4") || model.Contains("gpt-3.5") ||
                model.Contains("gpt-4o"));
    }

    /// <summary>
    /// Determines if Ollama model supports function calling.
    /// </summary>
    private static bool IsOllamaFunctionCallingModel(string model)
    {
        // Models known to support tools: llama3, mistral, mixtral, qwen2, deepseek-coder
        return model.Contains("llama3") || model.Contains("llama-3") ||
               model.Contains("mistral") || model.Contains("mixtral") ||
               model.Contains("qwen") || model.Contains("deepseek") ||
               model.Contains("codellama") || model.Contains("command-r");
    }

    /// <summary>
    /// Determines if strict mode (structured outputs) should be enabled for tools.
    /// </summary>
    public static bool SupportsStrictToolMode(string provider, string model)
    {
        var providerLower = provider.ToLowerInvariant();
        var modelLower = model.ToLowerInvariant();

        return providerLower switch
        {
            "openai" => modelLower.Contains("gpt-4o") || modelLower.Contains("gpt-4-turbo"),
            _ => false
        };
    }

    #endregion

    #region Effort/Reasoning Control

    /// <summary>
    /// Determines if a provider/model supports effort control for reasoning.
    /// </summary>
    public static bool SupportsEffortControl(string provider, string model)
    {
        var providerLower = provider.ToLowerInvariant();
        var modelLower = model.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => modelLower.Contains("opus-4-5") || modelLower.Contains("opus-4.5"),
            "grok" or "xai" => true, // All Grok models support effort levels
            _ => false
        };
    }

    /// <summary>
    /// Gets the valid effort levels for a provider.
    /// </summary>
    public static string[] GetValidEffortLevels(string provider)
    {
        var providerLower = provider.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => new[] { "low", "medium", "high" },
            "grok" or "xai" => new[] { "low", "medium", "high" },
            _ => Array.Empty<string>()
        };
    }

    /// <summary>
    /// Normalizes an effort level string to a valid value.
    /// </summary>
    public static string NormalizeEffortLevel(string? effort, string defaultValue = "medium")
    {
        if (string.IsNullOrEmpty(effort))
            return defaultValue;

        var normalized = effort.ToLowerInvariant().Trim();
        return normalized switch
        {
            "low" or "l" or "1" => "low",
            "medium" or "med" or "m" or "2" => "medium",
            "high" or "h" or "3" => "high",
            _ => defaultValue
        };
    }

    #endregion

    #region Prompt Caching Support

    /// <summary>
    /// Determines if a provider supports prompt caching.
    /// </summary>
    public static bool SupportsPromptCaching(string provider)
    {
        var providerLower = provider.ToLowerInvariant();
        return providerLower is "anthropic" or "claude" or "gemini" or "openai";
    }

    /// <summary>
    /// Gets minimum content length for prompt caching to be effective.
    /// </summary>
    public static int GetMinCachingTokens(string provider)
    {
        var providerLower = provider.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => 1024, // Anthropic minimum
            "gemini" => 4096, // Gemini CachedContent minimum
            "openai" => 1024, // OpenAI approximate minimum
            _ => int.MaxValue // Effectively disabled
        };
    }

    #endregion

    #region Token Limits

    /// <summary>
    /// Gets the maximum thinking budget tokens for a provider.
    /// </summary>
    public static int GetMaxThinkingBudget(string provider, string model)
    {
        var providerLower = provider.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => 100000, // Claude allows up to 100k thinking tokens
            "gemini" => 24576, // Gemini 2.0 default max
            "grok" or "xai" => 32768, // Grok estimate
            _ => 10000 // Default fallback
        };
    }

    /// <summary>
    /// Gets the minimum thinking budget tokens for a provider.
    /// </summary>
    public static int GetMinThinkingBudget(string provider)
    {
        var providerLower = provider.ToLowerInvariant();

        return providerLower switch
        {
            "anthropic" or "claude" => 1024, // Claude minimum
            _ => 1024 // Default minimum
        };
    }

    #endregion

    #region Provider Feature Summary

    /// <summary>
    /// Gets a complete feature summary for a provider/model combination.
    /// </summary>
    public static ProviderFeatureSummary GetFeatureSummary(string provider, string model)
    {
        return new ProviderFeatureSummary
        {
            Provider = provider,
            Model = model,
            SupportsNativeThinking = SupportsNativeThinking(provider, model),
            SupportsGrounding = SupportsGrounding(provider),
            SupportsXSearch = SupportsXSearch(provider),
            SupportsCodeExecution = SupportsCodeExecution(provider),
            SupportsFunctionCalling = SupportsFunctionCalling(provider, model),
            SupportsStrictToolMode = SupportsStrictToolMode(provider, model),
            SupportsEffortControl = SupportsEffortControl(provider, model),
            SupportsPromptCaching = SupportsPromptCaching(provider),
            MaxThinkingBudget = GetMaxThinkingBudget(provider, model),
            MinThinkingBudget = GetMinThinkingBudget(provider),
            MinCachingTokens = GetMinCachingTokens(provider)
        };
    }

    #endregion
}

/// <summary>
/// Summary of features supported by a provider/model combination.
/// </summary>
public class ProviderFeatureSummary
{
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public bool SupportsNativeThinking { get; set; }
    public bool SupportsGrounding { get; set; }
    public bool SupportsXSearch { get; set; }
    public bool SupportsCodeExecution { get; set; }
    public bool SupportsFunctionCalling { get; set; }
    public bool SupportsStrictToolMode { get; set; }
    public bool SupportsEffortControl { get; set; }
    public bool SupportsPromptCaching { get; set; }
    public int MaxThinkingBudget { get; set; }
    public int MinThinkingBudget { get; set; }
    public int MinCachingTokens { get; set; }
}
