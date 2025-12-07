using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.Configuration;

public class AIProvidersSettings
{
    public const string SectionName = "AIProviders";

    public OpenAISettings OpenAI { get; set; } = new();
    public GeminiSettings Gemini { get; set; } = new();
    public AnthropicSettings Anthropic { get; set; } = new();
    public OllamaSettings Ollama { get; set; } = new();
    public XAISettings XAI { get; set; } = new();
}

public class OpenAISettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string DefaultModel { get; set; } = "gpt-4-turbo";
    public int MaxTokens { get; set; } = 4096;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 30;
}

public class GeminiSettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
    public string DefaultModel { get; set; } = "gemini-1.5-flash";
    public int MaxTokens { get; set; } = 8192;
    public float Temperature { get; set; } = 0.7f;
    public float TopP { get; set; } = 0.9f;
    public int TopK { get; set; } = 40;
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Feature flags for Gemini SDK capabilities
    /// </summary>
    public GeminiFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Google Search grounding configuration
    /// </summary>
    public GeminiGroundingConfig Grounding { get; set; } = new();

    /// <summary>
    /// Code execution (Python sandbox) configuration
    /// </summary>
    public GeminiCodeExecutionConfig CodeExecution { get; set; } = new();

    /// <summary>
    /// Thinking mode (extended reasoning) configuration
    /// </summary>
    public GeminiThinkingConfig Thinking { get; set; } = new();

    /// <summary>
    /// Content safety filter settings
    /// </summary>
    public GeminiSafetyConfig SafetySettings { get; set; } = new();

    /// <summary>
    /// Context caching configuration for reducing latency and costs
    /// </summary>
    public GeminiCachingConfig Caching { get; set; } = new();
}

/// <summary>
/// Feature flags for enabling/disabling Gemini SDK capabilities
/// </summary>
public class GeminiFeaturesConfig
{
    /// <summary>
    /// Enable native function calling (tools) support
    /// </summary>
    public bool EnableFunctionCalling { get; set; } = true;

    /// <summary>
    /// Enable Python code execution in secure sandbox
    /// </summary>
    public bool EnableCodeExecution { get; set; } = false;

    /// <summary>
    /// Enable Google Search grounding for real-time information
    /// </summary>
    public bool EnableGrounding { get; set; } = false;

    /// <summary>
    /// Enable thinking mode for complex reasoning (Gemini 2.0+)
    /// </summary>
    public bool EnableThinking { get; set; } = false;

    /// <summary>
    /// Enable context caching for reducing latency and costs with large contexts
    /// </summary>
    public bool EnableContextCaching { get; set; } = false;
}

/// <summary>
/// Google Search grounding configuration
/// </summary>
public class GeminiGroundingConfig
{
    /// <summary>
    /// Dynamic retrieval threshold (0.0-1.0). Lower values = more grounding.
    /// </summary>
    public float DynamicThreshold { get; set; } = 0.3f;

    /// <summary>
    /// Maximum number of grounding sources to return
    /// </summary>
    public int MaxSources { get; set; } = 5;

    /// <summary>
    /// Use dynamic retrieval (model decides when to ground)
    /// </summary>
    public bool UseDynamicRetrieval { get; set; } = true;
}

/// <summary>
/// Code execution configuration
/// </summary>
public class GeminiCodeExecutionConfig
{
    /// <summary>
    /// Maximum execution time in seconds
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Thinking mode configuration for extended reasoning
/// </summary>
public class GeminiThinkingConfig
{
    /// <summary>
    /// Default token budget for thinking process
    /// </summary>
    public int DefaultBudget { get; set; } = 1024;

    /// <summary>
    /// Maximum allowed thinking budget
    /// </summary>
    public int MaxBudget { get; set; } = 4096;

    /// <summary>
    /// Include thinking process in response (for debugging/transparency)
    /// </summary>
    public bool IncludeThinkingInResponse { get; set; } = false;
}

/// <summary>
/// Content safety filter settings
/// </summary>
public class GeminiSafetyConfig
{
    /// <summary>
    /// Harassment content filter level
    /// Options: BlockNone, BlockOnlyHigh, BlockMediumAndAbove, BlockLowAndAbove
    /// </summary>
    public string Harassment { get; set; } = "BlockMediumAndAbove";

    /// <summary>
    /// Hate speech filter level
    /// </summary>
    public string HateSpeech { get; set; } = "BlockMediumAndAbove";

    /// <summary>
    /// Sexually explicit content filter level
    /// </summary>
    public string SexualContent { get; set; } = "BlockMediumAndAbove";

    /// <summary>
    /// Dangerous content filter level
    /// </summary>
    public string DangerousContent { get; set; } = "BlockMediumAndAbove";
}

/// <summary>
/// Context caching configuration for reducing latency and costs with large contexts
/// </summary>
public class GeminiCachingConfig
{
    /// <summary>
    /// Default time-to-live for cached content in minutes
    /// </summary>
    public int DefaultTtlMinutes { get; set; } = 60;

    /// <summary>
    /// Maximum allowed TTL for cached content in minutes (24 hours max)
    /// </summary>
    public int MaxTtlMinutes { get; set; } = 1440;

    /// <summary>
    /// Minimum token count for content to be eligible for caching.
    /// Gemini requires a minimum of ~32K tokens for caching to be cost-effective.
    /// </summary>
    public int MinContentTokens { get; set; } = 32000;

    /// <summary>
    /// Whether to automatically clean up expired caches from the database
    /// </summary>
    public bool AutoCleanupExpired { get; set; } = true;
}

public class AnthropicSettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.anthropic.com/v1";
    public string DefaultModel { get; set; } = "claude-3-5-sonnet-20240620";
    public int MaxTokens { get; set; } = 8192;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 60;
    public string Version { get; set; } = "2023-06-01";
}

public class OllamaSettings
{
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string DefaultModel { get; set; } = "llama3.2";
    public string KeepAlive { get; set; } = "5m";
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    public bool StreamingEnabled { get; set; } = true;
}

public class XAISettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.x.ai/v1";
    public string DefaultModel { get; set; } = "grok-2-1212";
    public int MaxTokens { get; set; } = 4096;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 30;
}
