# ADR 004: AI Provider Factory Pattern

## Status

Accepted

## Context

Second Brain integrates with multiple AI providers:

- **OpenAI** - GPT-4, GPT-4o, DALL-E
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus
- **Google** - Gemini 2.0, Gemini image generation
- **Ollama** - Local models (Llama, Qwen, etc.)
- **X.AI** - Grok models, Aurora image generation

Each provider has:

- Different API formats and authentication
- Different model names and capabilities
- Different rate limits and error handling
- Different streaming implementations

We needed a pattern that:

1. Abstracts provider differences behind a common interface
2. Allows runtime provider selection based on user preference
3. Supports health checking and failover
4. Makes adding new providers straightforward
5. Handles both text generation and image generation

## Decision

We will use the **Factory Pattern** combined with a **Provider Interface** abstraction.

### Provider Interfaces

```csharp
// Text generation providers
public interface IAIProvider
{
    string Name { get; }
    bool IsEnabled { get; }
    IReadOnlyList<string> SupportedModels { get; }
    
    Task<string> GenerateResponseAsync(
        IEnumerable<ChatMessage> messages,
        string model,
        CancellationToken ct = default);
    
    IAsyncEnumerable<string> StreamResponseAsync(
        IEnumerable<ChatMessage> messages,
        string model,
        CancellationToken ct = default);
    
    Task<AIProviderHealth> GetHealthStatusAsync(CancellationToken ct = default);
}

// Image generation providers
public interface IImageGenerationProvider
{
    string Name { get; }
    bool IsEnabled { get; }
    IReadOnlyList<string> SupportedModels { get; }
    
    Task<GeneratedImage> GenerateImageAsync(
        string prompt,
        ImageGenerationOptions options,
        CancellationToken ct = default);
}
```

### Factory Implementation

```csharp
public interface IAIProviderFactory
{
    IAIProvider GetProvider(string providerName);
    IEnumerable<IAIProvider> GetAllProviders();
    IEnumerable<IAIProvider> GetEnabledProviders();
}

public class AIProviderFactory : IAIProviderFactory
{
    private readonly Dictionary<string, IAIProvider> _providers;
    
    public AIProviderFactory(
        OpenAIProvider openai,
        ClaudeProvider claude,
        GeminiProvider gemini,
        OllamaProvider ollama,
        GrokProvider grok)
    {
        _providers = new Dictionary<string, IAIProvider>(StringComparer.OrdinalIgnoreCase)
        {
            ["OpenAI"] = openai,
            ["Anthropic"] = claude,
            ["Gemini"] = gemini,
            ["Ollama"] = ollama,
            ["XAI"] = grok,
        };
    }
    
    public IAIProvider GetProvider(string providerName)
    {
        if (_providers.TryGetValue(providerName, out var provider))
            return provider;
        throw new ArgumentException($"Unknown provider: {providerName}");
    }
}
```

### Circuit Breaker Integration

We wrap the factory with a circuit breaker decorator to handle provider failures:

```csharp
public class CircuitBreakerAIProviderFactory : IAIProviderFactory
{
    private readonly IAIProviderFactory _inner;
    private readonly ConcurrentDictionary<string, AIProviderCircuitBreaker> _breakers;
    
    public IAIProvider GetProvider(string providerName)
    {
        var provider = _inner.GetProvider(providerName);
        var breaker = _breakers.GetOrAdd(providerName, _ => new AIProviderCircuitBreaker());
        return new CircuitBreakerAIProvider(provider, breaker);
    }
}
```

## Consequences

### Positive

- **Abstraction** - Controllers and services don't know provider details
- **Extensibility** - Adding a new provider is just implementing the interface
- **Testability** - Easy to mock providers in tests
- **Runtime selection** - Users can switch providers without code changes
- **Health monitoring** - Unified health check across all providers
- **Failover ready** - Circuit breaker pattern prevents cascade failures

### Negative

- **Abstraction cost** - Some provider-specific features may not fit the interface
- **Lowest common denominator** - Interface must support all providers' capabilities
- **Complexity** - More classes and indirection than direct API calls

### Neutral

- Each provider is registered as a singleton (maintains connection state)
- Factory is also singleton to cache provider instances
- Provider-specific options passed through generic options objects
