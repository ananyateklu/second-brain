using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using System.Runtime.CompilerServices;

namespace SecondBrain.Tests.Integration.Fixtures;

/// <summary>
/// Mock AI provider factory for integration tests.
/// Returns predictable responses without calling external APIs.
/// </summary>
public class MockAIProviderFactory : IAIProviderFactory
{
    private readonly MockAIProvider _mockProvider = new();

    public IAIProvider GetProvider(string providerName)
    {
        return _mockProvider;
    }

    public IEnumerable<IAIProvider> GetAllProviders()
    {
        return new[] { _mockProvider };
    }

    public IEnumerable<IAIProvider> GetEnabledProviders()
    {
        return new[] { _mockProvider };
    }
}

/// <summary>
/// Mock AI provider that returns predictable responses.
/// </summary>
public class MockAIProvider : IAIProvider
{
    public string ProviderName => "MockProvider";
    public bool IsEnabled => true;

    /// <summary>
    /// Default response content for chat completions.
    /// Can be modified in tests to verify specific behaviors.
    /// </summary>
    public string ResponseContent { get; set; } = "This is a mock AI response for testing purposes.";

    /// <summary>
    /// Simulated latency in milliseconds for responses.
    /// </summary>
    public int SimulatedLatencyMs { get; set; } = 10;

    /// <summary>
    /// Whether the provider should simulate failures.
    /// </summary>
    public bool ShouldFail { get; set; } = false;

    /// <summary>
    /// Error message to return when ShouldFail is true.
    /// </summary>
    public string FailureMessage { get; set; } = "Simulated provider failure";

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(!ShouldFail);
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new AIProviderHealth
        {
            Provider = ProviderName,
            IsHealthy = !ShouldFail,
            Status = ShouldFail ? "Unavailable" : "Available",
            AvailableModels = new[] { "mock-model", "mock-model-v2" },
            ErrorMessage = ShouldFail ? FailureMessage : null,
            CheckedAt = DateTime.UtcNow,
            ResponseTimeMs = 10
        });
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(
        Dictionary<string, string>? configOverrides,
        CancellationToken cancellationToken = default)
    {
        return GetHealthStatusAsync(cancellationToken);
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        await Task.Delay(SimulatedLatencyMs, cancellationToken);

        if (ShouldFail)
        {
            return new AIResponse
            {
                Success = false,
                Error = FailureMessage,
                Provider = ProviderName
            };
        }

        return new AIResponse
        {
            Success = true,
            Content = ResponseContent,
            Provider = ProviderName,
            Model = request.Model ?? "mock-model",
            TokensUsed = ResponseContent.Split(' ').Length
        };
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        await Task.Delay(SimulatedLatencyMs, cancellationToken);

        if (ShouldFail)
        {
            return new AIResponse
            {
                Success = false,
                Error = FailureMessage,
                Provider = ProviderName
            };
        }

        return new AIResponse
        {
            Success = true,
            Content = ResponseContent,
            Provider = ProviderName,
            Model = settings?.Model ?? "mock-model",
            TokensUsed = ResponseContent.Split(' ').Length
        };
    }

    public Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(StreamCompletionAsyncInternal(request, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamCompletionAsyncInternal(
        AIRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (ShouldFail)
        {
            throw new InvalidOperationException(FailureMessage);
        }

        // Simulate streaming by yielding words one at a time
        var words = ResponseContent.Split(' ');
        foreach (var word in words)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(SimulatedLatencyMs / Math.Max(1, words.Length), cancellationToken);
            yield return word + " ";
        }
    }

    public Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(StreamChatCompletionAsyncInternal(messages, settings, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionAsyncInternal(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (ShouldFail)
        {
            throw new InvalidOperationException(FailureMessage);
        }

        // Simulate streaming by yielding words one at a time
        var words = ResponseContent.Split(' ');
        foreach (var word in words)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(SimulatedLatencyMs / Math.Max(1, words.Length), cancellationToken);
            yield return word + " ";
        }
    }
}

/// <summary>
/// Mock embedding provider factory for integration tests.
/// </summary>
public class MockEmbeddingProviderFactory : IEmbeddingProviderFactory
{
    private readonly MockEmbeddingProvider _mockProvider = new();

    public IEmbeddingProvider GetProvider(string providerName)
    {
        return _mockProvider;
    }

    public IEmbeddingProvider GetDefaultProvider()
    {
        return _mockProvider;
    }

    public IEnumerable<IEmbeddingProvider> GetAllProviders()
    {
        return new[] { _mockProvider };
    }
}

/// <summary>
/// Mock embedding provider that returns deterministic embeddings.
/// </summary>
public class MockEmbeddingProvider : IEmbeddingProvider
{
    public string ProviderName => "MockEmbedding";
    public string ModelName => "mock-embedding-model";
    public bool IsEnabled => true;
    public int Dimensions => 1536;

    public Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        var models = new List<EmbeddingModelInfo>
        {
            new()
            {
                ModelId = ModelName,
                DisplayName = "Mock Embedding Model",
                Dimensions = Dimensions,
                IsDefault = true,
                Description = "Deterministic mock embedding model for tests"
            }
        };

        return Task.FromResult<IEnumerable<EmbeddingModelInfo>>(models);
    }

    /// <summary>
    /// Whether the provider should simulate failures.
    /// </summary>
    public bool ShouldFail { get; set; } = false;

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(!ShouldFail);
    }

    public Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        if (ShouldFail)
        {
            return Task.FromResult(new EmbeddingResponse
            {
                Success = false,
                Error = "Simulated embedding failure",
                Provider = ProviderName
            });
        }

        // Generate deterministic embedding based on text hash
        var embedding = GenerateDeterministicEmbedding(text);

        return Task.FromResult(new EmbeddingResponse
        {
            Success = true,
            Embedding = embedding,
            Provider = ProviderName,
            TokensUsed = text.Split(' ').Length
        });
    }

    public Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default)
    {
        if (ShouldFail)
        {
            return Task.FromResult(new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Simulated embedding failure",
                Provider = ProviderName
            });
        }

        var embeddings = texts.Select(GenerateDeterministicEmbedding).ToList();
        var totalTokens = texts.Sum(t => t.Split(' ').Length);

        return Task.FromResult(new BatchEmbeddingResponse
        {
            Success = true,
            Embeddings = embeddings,
            Provider = ProviderName,
            TotalTokensUsed = totalTokens
        });
    }

    private List<double> GenerateDeterministicEmbedding(string text)
    {
        // Generate a deterministic embedding based on text hash
        var hash = text.GetHashCode();
        var random = new Random(hash);

        return Enumerable.Range(0, Dimensions)
            .Select(_ => random.NextDouble() * 2 - 1) // Values between -1 and 1
            .ToList();
    }
}
