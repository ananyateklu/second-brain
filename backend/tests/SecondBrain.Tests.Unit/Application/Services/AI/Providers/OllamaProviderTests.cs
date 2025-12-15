using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.Providers;

/// <summary>
/// Unit tests for OllamaProvider.
/// Tests provider behavior, disabled states, health checks, and URL handling.
/// </summary>
public class OllamaProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockOptions;
    private readonly Mock<ILogger<OllamaProvider>> _mockLogger;

    public OllamaProviderTests()
    {
        _mockOptions = new Mock<IOptions<AIProvidersSettings>>();
        _mockLogger = new Mock<ILogger<OllamaProvider>>();
    }

    #region Provider Initialization Tests

    [Fact]
    public void Constructor_WhenProviderDisabled_IsEnabledReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WhenProviderEnabled_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var act = () => CreateProvider();

        // Assert
        act.Should().NotThrow();
    }

    #endregion

    #region ProviderName and IsEnabled Tests

    [Fact]
    public void ProviderName_ReturnsCorrectName()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Ollama");
    }

    [Fact]
    public void IsEnabled_WhenSettingEnabled_ReturnsTrue()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void IsEnabled_WhenSettingDisabled_ReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    #endregion

    #region GenerateCompletionAsync Tests - Disabled State

    [Fact]
    public async Task GenerateCompletionAsync_WhenDisabled_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test prompt" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Ollama");
    }

    #endregion

    #region GenerateChatCompletionAsync Tests - Disabled State

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenDisabled_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var result = await provider.GenerateChatCompletionAsync(messages);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Ollama");
    }

    #endregion

    #region StreamCompletionAsync Tests - Disabled State

    [Fact]
    public async Task StreamCompletionAsync_WhenDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test" };

        // Act
        var stream = await provider.StreamCompletionAsync(request);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamCompletionAsync_WhenStreamingDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, streamingEnabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test" };

        // Act
        var stream = await provider.StreamCompletionAsync(request);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
    }

    #endregion

    #region StreamChatCompletionAsync Tests - Disabled State

    [Fact]
    public async Task StreamChatCompletionAsync_WhenDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamChatCompletionAsync_WhenStreamingDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, streamingEnabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
    }

    #endregion

    #region StreamChatCompletionWithUsageAsync Tests - Disabled State

    [Fact]
    public async Task StreamChatCompletionWithUsageAsync_WhenDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };
        StreamingTokenUsage? capturedUsage = null;

        // Act
        var stream = await provider.StreamChatCompletionWithUsageAsync(
            messages, null, usage => capturedUsage = usage);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
        capturedUsage.Should().BeNull();
    }

    [Fact]
    public async Task StreamChatCompletionWithUsageAsync_WhenStreamingDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, streamingEnabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };
        StreamingTokenUsage? capturedUsage = null;

        // Act
        var stream = await provider.StreamChatCompletionWithUsageAsync(
            messages, null, usage => capturedUsage = usage);

        // Assert
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }
        items.Should().BeEmpty();
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenDisabled_ReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetHealthStatusAsync Tests

    [Fact]
    public async Task GetHealthStatusAsync_WhenDisabled_ReturnsDisabledStatus()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var health = await provider.GetHealthStatusAsync();

        // Assert
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Disabled");
        health.Provider.Should().Be("Ollama");
        health.ErrorMessage.Should().Contain("disabled");
    }

    [Fact]
    public async Task GetHealthStatusAsync_SetsCheckedAtTimestamp()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var beforeCall = DateTime.UtcNow;

        // Act
        var health = await provider.GetHealthStatusAsync();

        // Assert
        health.CheckedAt.Should().BeOnOrAfter(beforeCall);
        health.CheckedAt.Should().BeOnOrBefore(DateTime.UtcNow);
    }

    [Fact]
    public async Task GetHealthStatusAsync_WithConfigOverrides_UsesOverrideUrl()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var overrides = new Dictionary<string, string>
        {
            { "ollamaBaseUrl", "http://remote:11434" }
        };

        // Act - This will timeout because the remote URL doesn't exist, but tests the path
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        var health = await provider.GetHealthStatusAsync(overrides, cts.Token);

        // Assert - Should be unhealthy because we can't connect
        health.IsHealthy.Should().BeFalse();
    }

    #endregion

    #region GetClient Tests

    [Fact]
    public void GetClient_WhenDisabled_ReturnsNull()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var client = provider.GetClient();

        // Assert
        client.Should().BeNull();
    }

    [Fact]
    public void GetClient_WithOverrideUrl_ReturnsClientForUrl()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var client = provider.GetClient("http://localhost:11434");

        // Assert
        client.Should().NotBeNull();
    }

    [Fact]
    public void GetClient_WithSameOverrideUrl_ReturnsCachedClient()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var overrideUrl = "http://test-ollama:11434";

        // Act
        var client1 = provider.GetClient(overrideUrl);
        var client2 = provider.GetClient(overrideUrl);

        // Assert
        client1.Should().BeSameAs(client2);
    }

    #endregion

    #region StreamWithToolsAsync Tests - Disabled State

    [Fact]
    public async Task StreamWithToolsAsync_WhenDisabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage>();
        var tools = new List<OllamaSharp.Models.Chat.Tool>();

        // Act
        var events = new List<OllamaToolStreamEvent>();
        await foreach (var evt in provider.StreamWithToolsAsync(messages, tools))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(OllamaToolStreamEventType.Error);
        events.First().Error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task StreamWithToolsAsync_WhenStreamingDisabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, streamingEnabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage>();
        var tools = new List<OllamaSharp.Models.Chat.Tool>();

        // Act
        var events = new List<OllamaToolStreamEvent>();
        await foreach (var evt in provider.StreamWithToolsAsync(messages, tools))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(OllamaToolStreamEventType.Error);
        events.First().Error.Should().Contain("Streaming is not enabled");
    }

    #endregion

    #region Model Management Tests - Disabled State

    [Fact]
    public async Task ListModelsAsync_WhenDisabled_ReturnsEmptyList()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var models = await provider.ListModelsAsync();

        // Assert
        models.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteModelAsync_WhenDisabled_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var (success, error) = await provider.DeleteModelAsync("llama3:8b");

        // Assert
        success.Should().BeFalse();
        error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task ShowModelAsync_WhenDisabled_ReturnsNull()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var details = await provider.ShowModelAsync("llama3:8b");

        // Assert
        details.Should().BeNull();
    }

    [Fact]
    public async Task CopyModelAsync_WhenDisabled_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var result = await provider.CopyModelAsync("source", "destination");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Source.Should().Be("source");
        result.Destination.Should().Be("destination");
    }

    [Fact]
    public async Task PullModelAsync_WhenDisabled_YieldsErrorProgress()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var progress = new List<OllamaPullProgress>();
        await foreach (var p in provider.PullModelAsync("llama3:8b"))
        {
            progress.Add(p);
        }

        // Assert
        progress.Should().ContainSingle();
        progress.First().IsError.Should().BeTrue();
        progress.First().ErrorMessage.Should().Contain("not enabled");
    }

    [Fact]
    public async Task CreateModelAsync_WhenDisabled_YieldsErrorStatus()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var progress = new List<OllamaCreateProgress>();
        await foreach (var p in provider.CreateModelAsync("test-model", "FROM llama3:8b"))
        {
            progress.Add(p);
        }

        // Assert
        progress.Should().ContainSingle();
        progress.First().Status.Should().Contain("Error");
    }

    [Fact]
    public async Task CreateModelAsync_WithoutFromDirective_YieldsErrorStatus()
    {
        // Arrange
        var settings = CreateSettings(enabled: true);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var progress = new List<OllamaCreateProgress>();
        await foreach (var p in provider.CreateModelAsync("test-model", "SYSTEM You are helpful"))
        {
            progress.Add(p);
        }

        // Assert
        progress.Should().ContainSingle();
        progress.First().Status.Should().Contain("Modelfile must contain a FROM directive");
    }

    #endregion

    #region Settings Override Tests

    [Theory]
    [InlineData("llama3:8b")]
    [InlineData("codellama:13b")]
    [InlineData("mistral:7b")]
    public async Task GenerateCompletionAsync_AcceptsVariousModelNames(string modelName)
    {
        // Arrange
        var settings = CreateSettings(enabled: false, defaultModel: modelName);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test", Model = modelName };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Provider.Should().Be("Ollama");
    }

    #endregion

    #region Helper Methods

    private OllamaProvider CreateProvider()
    {
        return new OllamaProvider(
            _mockOptions.Object,
            _mockLogger.Object);
    }

    private static AIProvidersSettings CreateSettings(
        bool enabled = false,
        string defaultModel = "llama3:8b",
        bool streamingEnabled = true)
    {
        return new AIProvidersSettings
        {
            Ollama = new OllamaSettings
            {
                Enabled = enabled,
                BaseUrl = "http://localhost:11434",
                DefaultModel = defaultModel,
                Temperature = 0.7f,
                StreamingEnabled = streamingEnabled
            }
        };
    }

    #endregion
}
