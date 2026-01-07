# AI Providers

## Provider Capabilities Matrix

| Feature | OpenAI | Gemini | Claude | Grok | Ollama | Cohere |
|---------|--------|--------|--------|------|--------|--------|
| Function Calling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vision | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Structured Output | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| Extended Thinking | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Prompt Caching | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Live Web Search | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| File Upload | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Image Generation | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Reranking | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Embeddings | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |

## Service Structure

```text
Services/AI/                # 73 files - Multi-provider AI
├── Providers/              # 7 AI providers + factories
├── CircuitBreaker/         # Polly resilience
└── ImageProviders/         # 3 image generation providers
```

## Factory Usage

```csharp
// Get AI provider by name
IAIProvider provider = _aiProviderFactory.GetProvider("OpenAI");
IAIProvider claudeProvider = _aiProviderFactory.GetProvider("Anthropic");

// Get image generation provider
IImageGenerationProvider imgProvider = _imageProviderFactory.GetProvider("Gemini");
IImageGenerationProvider dalleProvider = _imageProviderFactory.GetProvider("OpenAI");

// Get embedding provider
IEmbeddingProvider embedProvider = _embeddingProviderFactory.GetProvider("Cohere");
```

## Circuit Breaker Configuration

Location: `AI/CircuitBreaker/AIProviderCircuitBreaker.cs`

- **Failure Threshold**: 50% failure rate triggers open state
- **Break Duration**: 60 seconds before half-open state
- **Retry Policy**: Exponential backoff with jitter

## Image Generation Providers

| Provider | Model | Notes |
|----------|-------|-------|
| OpenAI | DALL-E 3 | High quality, slower |
| Gemini | Imagen | Fast, good quality |
| Grok | Aurora | Experimental |

## Embedding Providers

| Provider | Model | Dimensions |
|----------|-------|------------|
| OpenAI | text-embedding-3-small/large | 1536/3072 |
| Gemini | text-embedding-004 | 768 |
| Ollama | nomic-embed-text | 768 |
| Cohere | embed-v3 | 1024 |
