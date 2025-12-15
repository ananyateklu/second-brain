using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.FileManagement;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.Providers;

/// <summary>
/// Unit tests for GeminiProvider (Google Gemini).
/// Tests provider behavior, disabled states, and health checks.
/// </summary>
public class GeminiProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockOptions;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<IGeminiFileService> _mockFileService;
    private readonly Mock<ILogger<GeminiProvider>> _mockLogger;

    public GeminiProviderTests()
    {
        _mockOptions = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockFileService = new Mock<IGeminiFileService>();
        _mockLogger = new Mock<ILogger<GeminiProvider>>();
    }

    #region Provider Initialization Tests

    [Fact]
    public void Constructor_WhenProviderDisabled_IsEnabledReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "test-key");
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WhenApiKeyMissing_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "");
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var act = () => CreateProvider();

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Constructor_WhenApiKeyNull_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: null);
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
        provider.ProviderName.Should().Be("Gemini");
    }

    [Fact]
    public void IsEnabled_WhenSettingEnabled_ReturnsTrue()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "test-key");
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
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenApiKeyEmpty_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "");
        _mockOptions.Setup(o => o.Value).Returns(settings);
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
        result.Provider.Should().Be("Gemini");
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
        health.Provider.Should().Be("Gemini");
        health.ErrorMessage.Should().Contain("disabled");
    }

    [Fact]
    public async Task GetHealthStatusAsync_WhenApiKeyEmpty_ReturnsNotConfiguredStatus()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "");
        _mockOptions.Setup(o => o.Value).Returns(settings);
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
        GeminiProvider.HttpClientName.Should().Be("Gemini");
    }

    #endregion

    #region Settings Override Tests

    [Theory]
    [InlineData("gemini-2.0-flash")]
    [InlineData("gemini-2.0-flash-thinking")]
    [InlineData("gemini-1.5-pro")]
    [InlineData("gemini-1.5-flash")]
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
        result.Provider.Should().Be("Gemini");
    }

    #endregion

    #region Feature Configurations Tests

    [Fact]
    public void Constructor_WithGroundingConfig_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "key");
        settings.Gemini.Grounding = new GeminiGroundingConfig
        {
            DynamicThreshold = 0.7f
        };
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var act = () => CreateProvider();

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Constructor_WithCodeExecutionConfig_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "key");
        settings.Gemini.CodeExecution = new GeminiCodeExecutionConfig();
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var act = () => CreateProvider();

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Constructor_WithThinkingConfig_DoesNotThrow()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "key");
        settings.Gemini.Thinking = new GeminiThinkingConfig();
        _mockOptions.Setup(o => o.Value).Returns(settings);

        // Act
        var act = () => CreateProvider();

        // Assert
        act.Should().NotThrow();
    }

    #endregion

    #region Helper Methods

    private GeminiProvider CreateProvider()
    {
        return new GeminiProvider(
            _mockOptions.Object,
            _mockHttpClientFactory.Object,
            _mockFileService.Object,
            _mockLogger.Object);
    }

    private static AIProvidersSettings CreateSettings(
        bool enabled = false,
        string? apiKey = null,
        string defaultModel = "gemini-2.0-flash")
    {
        return new AIProvidersSettings
        {
            Gemini = new GeminiSettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = 8192,
                Temperature = 0.7f,
                Grounding = new GeminiGroundingConfig(),
                CodeExecution = new GeminiCodeExecutionConfig(),
                Thinking = new GeminiThinkingConfig()
            }
        };
    }

    #endregion
}
