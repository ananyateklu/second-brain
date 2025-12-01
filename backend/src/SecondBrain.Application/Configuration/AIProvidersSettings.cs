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
