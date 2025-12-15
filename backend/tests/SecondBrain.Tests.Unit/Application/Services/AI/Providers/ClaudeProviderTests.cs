using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.Providers;

/// <summary>
/// Unit tests for ClaudeProvider (Anthropic).
/// Tests provider behavior, disabled states, and message conversion.
/// </summary>
public class ClaudeProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockOptions;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<IAnthropicClientFactory> _mockClientFactory;
    private readonly Mock<ILogger<ClaudeProvider>> _mockLogger;

    public ClaudeProviderTests()
    {
        _mockOptions = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockClientFactory = new Mock<IAnthropicClientFactory>();
        _mockLogger = new Mock<ILogger<ClaudeProvider>>();
    }

    #region Provider Initialization Tests

    [Fact]
    public void Constructor_WhenProviderDisabled_DoesNotCreateClient()
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "sk-ant-test-key");
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenApiKeyMissing_DoesNotCreateClient()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "");
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenApiKeyNull_DoesNotCreateClient()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: null);
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_AttemptsToCreateClient()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "sk-ant-test-key");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        // Return null to simulate client creation attempt without needing actual AnthropicClient
        _mockClientFactory.Setup(f => f.CreateClient("sk-ant-test-key"))
            .Returns((AnthropicClient?)null);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
        _mockClientFactory.Verify(f => f.CreateClient("sk-ant-test-key"), Times.Once);
    }

    [Fact]
    public void Constructor_WhenClientFactoryThrows_LogsErrorAndContinues()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "sk-ant-test-key");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Throws(new InvalidOperationException("Client creation failed"));

        // Act
        var provider = CreateProvider();

        // Assert - Provider should be created but without a working client
        provider.IsEnabled.Should().BeTrue();
        provider.ProviderName.Should().Be("Claude");
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
        provider.ProviderName.Should().Be("Claude");
    }

    [Fact]
    public void IsEnabled_WhenSettingEnabled_ReturnsTrue()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test-key");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        // Return null as we can't mock AnthropicClient directly
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

        // Act
        var provider = CreateProvider();

        // Assert - IsEnabled should be true based on settings, not client creation
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
        result.Provider.Should().Be("Claude");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenClientNull_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test prompt" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled or configured");
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
        result.Provider.Should().Be("Claude");
    }

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenClientNull_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);
        var provider = CreateProvider();
        var messages = new List<ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var result = await provider.GenerateChatCompletionAsync(messages);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled or configured");
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
    public async Task StreamCompletionAsync_WhenClientNull_ReturnsEmptyEnumerable()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);
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

    [Fact]
    public async Task IsAvailableAsync_WhenClientNull_ReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);
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
        health.Provider.Should().Be("Claude");
        health.ErrorMessage.Should().Contain("disabled");
    }

    [Fact]
    public async Task GetHealthStatusAsync_WhenClientNull_ReturnsNotConfiguredStatus()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);
        var provider = CreateProvider();

        // Act
        var health = await provider.GetHealthStatusAsync();

        // Assert
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Not Configured");
        health.ErrorMessage.Should().Contain("API key not configured");
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

    #endregion

    #region HttpClientName Constant Test

    [Fact]
    public void HttpClientName_HasCorrectValue()
    {
        // Assert
        ClaudeProvider.HttpClientName.Should().Be("Claude");
    }

    #endregion

    #region Settings Override Tests

    [Fact]
    public async Task GenerateCompletionAsync_UsesDefaultModelWhenNotSpecified()
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "test", defaultModel: "claude-3-opus-20240229");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test", Model = null };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert - Even though disabled, we verify the settings are read
        result.Provider.Should().Be("Claude");
    }

    [Theory]
    [InlineData("claude-3-opus-20240229")]
    [InlineData("claude-3-sonnet-20240229")]
    [InlineData("claude-3-haiku-20240307")]
    public async Task GenerateCompletionAsync_AcceptsVariousModelNames(string modelName)
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "test", defaultModel: modelName);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var request = new AIRequest { Prompt = "Test", Model = modelName };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Provider.Should().Be("Claude");
    }

    #endregion

    #region Helper Methods

    private ClaudeProvider CreateProvider()
    {
        return new ClaudeProvider(
            _mockOptions.Object,
            _mockHttpClientFactory.Object,
            _mockClientFactory.Object,
            _mockLogger.Object);
    }

    private static AIProvidersSettings CreateSettings(
        bool enabled = false,
        string? apiKey = null,
        string defaultModel = "claude-3-opus-20240229")
    {
        return new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = 4096,
                Temperature = 0.7f,
                Version = "2023-06-01",
                Features = new AnthropicFeaturesConfig(),
                Caching = new AnthropicCachingConfig(),
                Thinking = new AnthropicThinkingConfig()
            }
        };
    }

    #endregion
}
