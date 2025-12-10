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

    /// <summary>
    /// Feature flags for OpenAI SDK capabilities
    /// </summary>
    public OpenAIFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Function calling configuration
    /// </summary>
    public OpenAIFunctionCallingConfig FunctionCalling { get; set; } = new();
}

/// <summary>
/// Feature flags for enabling/disabling OpenAI SDK capabilities
/// </summary>
public class OpenAIFeaturesConfig
{
    /// <summary>
    /// Enable native function calling (tools) support
    /// </summary>
    public bool EnableFunctionCalling { get; set; } = true;

    /// <summary>
    /// Enable structured output (JSON schema) support
    /// </summary>
    public bool EnableStructuredOutput { get; set; } = true;

    /// <summary>
    /// Enable vision/multimodal model support
    /// </summary>
    public bool EnableVision { get; set; } = true;

    /// <summary>
    /// Enable web search via Responses API (when available)
    /// </summary>
    public bool EnableWebSearch { get; set; } = false;

    /// <summary>
    /// Enable audio chat support (gpt-4o-audio-preview)
    /// </summary>
    public bool EnableAudioChat { get; set; } = false;

    /// <summary>
    /// Enable audio transcription (Whisper)
    /// </summary>
    public bool EnableTranscription { get; set; } = false;

    /// <summary>
    /// Enable content moderation
    /// </summary>
    public bool EnableModeration { get; set; } = false;
}

/// <summary>
/// Function calling configuration for OpenAI
/// </summary>
public class OpenAIFunctionCallingConfig
{
    /// <summary>
    /// Maximum iterations for tool call loops
    /// </summary>
    public int MaxIterations { get; set; } = 10;

    /// <summary>
    /// Enable parallel execution of multiple tool calls
    /// </summary>
    public bool ParallelExecution { get; set; } = true;

    /// <summary>
    /// Timeout in seconds for individual tool executions
    /// </summary>
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
    /// Function calling configuration for agent tool execution
    /// </summary>
    public GeminiFunctionCallingConfig FunctionCalling { get; set; } = new();

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
/// Function calling configuration for Gemini agent tool execution
/// </summary>
public class GeminiFunctionCallingConfig
{
    /// <summary>
    /// Maximum iterations for tool call loops
    /// </summary>
    public int MaxIterations { get; set; } = 10;

    /// <summary>
    /// Enable parallel execution of multiple tool calls.
    /// Default is false to avoid DbContext concurrency issues.
    /// </summary>
    public bool ParallelExecution { get; set; } = false;

    /// <summary>
    /// Timeout in seconds for individual tool executions
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
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
    public bool EnableThinking { get; set; } = true;

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

    /// <summary>
    /// Feature flags for Anthropic/Claude SDK capabilities
    /// </summary>
    public AnthropicFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Extended thinking configuration for complex reasoning
    /// </summary>
    public AnthropicThinkingConfig Thinking { get; set; } = new();

    /// <summary>
    /// Prompt caching configuration for reducing latency and costs
    /// </summary>
    public AnthropicCachingConfig Caching { get; set; } = new();
}

/// <summary>
/// Feature flags for enabling/disabling Anthropic/Claude SDK capabilities
/// </summary>
public class AnthropicFeaturesConfig
{
    /// <summary>
    /// Enable native function calling (tools) support
    /// </summary>
    public bool EnableFunctionCalling { get; set; } = true;

    /// <summary>
    /// Enable extended thinking for complex reasoning (Claude 3.5+ models)
    /// </summary>
    public bool EnableExtendedThinking { get; set; } = false;

    /// <summary>
    /// Enable prompt caching to reduce costs and latency
    /// </summary>
    public bool EnablePromptCaching { get; set; } = true;

    /// <summary>
    /// Enable citation support for document grounding
    /// </summary>
    public bool EnableCitations { get; set; } = false;

    /// <summary>
    /// Enable PDF document processing
    /// </summary>
    public bool EnablePdfSupport { get; set; } = true;
}

/// <summary>
/// Extended thinking configuration for Claude's step-by-step reasoning
/// </summary>
public class AnthropicThinkingConfig
{
    /// <summary>
    /// Whether extended thinking is enabled by default
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// Default token budget for thinking process (min: 1024)
    /// </summary>
    public int DefaultBudget { get; set; } = 10000;

    /// <summary>
    /// Maximum allowed thinking budget
    /// </summary>
    public int MaxBudget { get; set; } = 50000;

    /// <summary>
    /// Include thinking process in response for transparency
    /// </summary>
    public bool IncludeThinkingInResponse { get; set; } = true;
}

/// <summary>
/// Prompt caching configuration for reducing latency and costs
/// </summary>
public class AnthropicCachingConfig
{
    /// <summary>
    /// Whether prompt caching is enabled
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Minimum content tokens required for caching to be cost-effective
    /// </summary>
    public int MinContentTokens { get; set; } = 1024;
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

    /// <summary>
    /// Feature flags for Ollama SDK capabilities
    /// </summary>
    public OllamaFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Function calling configuration
    /// </summary>
    public OllamaFunctionCallingConfig FunctionCalling { get; set; } = new();
}

/// <summary>
/// Feature flags for enabling/disabling Ollama SDK capabilities
/// </summary>
public class OllamaFeaturesConfig
{
    /// <summary>
    /// Enable native function calling (tools) support
    /// </summary>
    public bool EnableFunctionCalling { get; set; } = true;

    /// <summary>
    /// Enable structured output (JSON mode) support
    /// </summary>
    public bool EnableStructuredOutput { get; set; } = true;

    /// <summary>
    /// Enable vision/multimodal model support
    /// </summary>
    public bool EnableVision { get; set; } = true;
}

/// <summary>
/// Function calling configuration for Ollama
/// </summary>
public class OllamaFunctionCallingConfig
{
    /// <summary>
    /// Maximum iterations for tool call loops
    /// </summary>
    public int MaxIterations { get; set; } = 10;

    /// <summary>
    /// Enable parallel execution of multiple tool calls
    /// </summary>
    public bool ParallelExecution { get; set; } = true;

    /// <summary>
    /// Timeout in seconds for individual tool executions
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

public class XAISettings
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.x.ai/v1";
    public string DefaultModel { get; set; } = "grok-3-mini";
    public int MaxTokens { get; set; } = 4096;
    public float Temperature { get; set; } = 0.7f;
    public int TimeoutSeconds { get; set; } = 120;
    public int MaxContextTokens { get; set; } = 131072;

    /// <summary>
    /// Feature flags for Grok/X.AI SDK capabilities
    /// </summary>
    public GrokFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Function calling configuration
    /// </summary>
    public GrokFunctionCallingConfig FunctionCalling { get; set; } = new();

    /// <summary>
    /// Think mode configuration for extended reasoning
    /// </summary>
    public GrokThinkingConfig ThinkMode { get; set; } = new();

    /// <summary>
    /// Live Search configuration
    /// </summary>
    public GrokSearchConfig Search { get; set; } = new();

    /// <summary>
    /// DeepSearch configuration
    /// </summary>
    public GrokDeepSearchConfig DeepSearch { get; set; } = new();

    /// <summary>
    /// Image generation (Aurora) configuration
    /// </summary>
    public GrokImageConfig ImageGeneration { get; set; } = new();
}

/// <summary>
/// Feature flags for enabling/disabling Grok/X.AI SDK capabilities
/// </summary>
public class GrokFeaturesConfig
{
    /// <summary>
    /// Enable native function calling (tools) support
    /// </summary>
    public bool EnableFunctionCalling { get; set; } = true;

    /// <summary>
    /// Enable structured output (JSON schema) support
    /// </summary>
    public bool EnableStructuredOutput { get; set; } = true;

    /// <summary>
    /// Enable vision/multimodal model support
    /// </summary>
    public bool EnableVision { get; set; } = true;

    /// <summary>
    /// Enable Think Mode for extended reasoning
    /// </summary>
    public bool EnableThinkMode { get; set; } = true;

    /// <summary>
    /// Enable Live Search for real-time web data
    /// </summary>
    public bool EnableLiveSearch { get; set; } = true;

    /// <summary>
    /// Enable DeepSearch for comprehensive research
    /// </summary>
    public bool EnableDeepSearch { get; set; } = true;
}

/// <summary>
/// Function calling configuration for Grok
/// </summary>
public class GrokFunctionCallingConfig
{
    /// <summary>
    /// Maximum iterations for tool call loops
    /// </summary>
    public int MaxIterations { get; set; } = 10;

    /// <summary>
    /// Enable parallel execution of multiple tool calls
    /// </summary>
    public bool ParallelExecution { get; set; } = true;

    /// <summary>
    /// Timeout in seconds for individual tool executions
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Think mode configuration for Grok's extended reasoning
/// </summary>
public class GrokThinkingConfig
{
    /// <summary>
    /// Default effort level for thinking (low, medium, high)
    /// </summary>
    public string DefaultEffort { get; set; } = "medium";

    /// <summary>
    /// Include reasoning process in response for transparency
    /// </summary>
    public bool IncludeReasoningInResponse { get; set; } = false;
}

/// <summary>
/// Live Search configuration for real-time web and X data
/// </summary>
public class GrokSearchConfig
{
    /// <summary>
    /// Default search mode (auto, on, off)
    /// </summary>
    public string DefaultMode { get; set; } = "auto";

    /// <summary>
    /// Default search sources (web, x)
    /// </summary>
    public List<string> DefaultSources { get; set; } = new() { "web", "x" };

    /// <summary>
    /// Default recency filter (hour, day, week, month)
    /// </summary>
    public string DefaultRecency { get; set; } = "day";

    /// <summary>
    /// Maximum number of search results
    /// </summary>
    public int MaxResults { get; set; } = 10;
}

/// <summary>
/// DeepSearch configuration for comprehensive research
/// </summary>
public class GrokDeepSearchConfig
{
    /// <summary>
    /// Maximum number of sources to search
    /// </summary>
    public int MaxSources { get; set; } = 20;

    /// <summary>
    /// Maximum time in seconds for deep search
    /// </summary>
    public int MaxTimeSeconds { get; set; } = 120;
}

/// <summary>
/// Image generation (Aurora) configuration for Grok
/// </summary>
public class GrokImageConfig
{
    /// <summary>
    /// Default image generation model
    /// </summary>
    public string DefaultModel { get; set; } = "grok-2-image";

    /// <summary>
    /// Default image size
    /// </summary>
    public string DefaultSize { get; set; } = "1024x1024";

    /// <summary>
    /// Maximum images per request
    /// </summary>
    public int MaxCount { get; set; } = 4;
}
