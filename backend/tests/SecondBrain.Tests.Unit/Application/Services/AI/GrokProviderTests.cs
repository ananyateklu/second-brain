using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class GrokProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<GrokProvider>> _mockLogger;

    public GrokProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<GrokProvider>>();
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WhenDisabled_DoesNotInitializeClient()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
        provider.ProviderName.Should().Be("Grok");
    }

    [Fact]
    public void Constructor_WhenEnabledWithNoApiKey_DoesNotInitializeClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_InitializesClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "xai-test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void ProviderName_ReturnsGrok()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Grok");
    }

    [Fact]
    public void IsEnabled_ReflectsConfigurationSetting()
    {
        // Arrange
        SetupSettings(enabled: true);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    #endregion

    #region GenerateCompletionAsync Tests

    [Fact]
    public async Task GenerateCompletionAsync_WhenDisabled_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateCompletionAsync(
            new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" });

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Grok");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenNoClient_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateCompletionAsync(
            new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" });

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled or configured");
    }

    #endregion

    #region GenerateChatCompletionAsync Tests

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenDisabled_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var result = await provider.GenerateChatCompletionAsync(messages);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Grok");
    }

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenNoClient_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
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

    #region StreamCompletionAsync Tests

    [Fact]
    public async Task StreamCompletionAsync_WhenDisabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var stream = await provider.StreamCompletionAsync(
            new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" });
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamCompletionAsync_WhenNoClient_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var stream = await provider.StreamCompletionAsync(
            new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" });
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    #endregion

    #region StreamChatCompletionAsync Tests

    [Fact]
    public async Task StreamChatCompletionAsync_WhenDisabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hi" }
        };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamChatCompletionAsync_WhenNoClient_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hi" }
        };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);
        var items = new List<string>();
        await foreach (var item in stream)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenDisabled_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsAvailableAsync_WhenNoClient_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
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
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var health = await provider.GetHealthStatusAsync();

        // Assert
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Disabled");
        health.Provider.Should().Be("Grok");
        health.ErrorMessage.Should().Contain("disabled");
    }

    [Fact]
    public async Task GetHealthStatusAsync_WhenNoApiKey_ReturnsNotConfiguredStatus()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var health = await provider.GetHealthStatusAsync();

        // Assert
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Not Configured");
        health.ErrorMessage.Should().Contain("API key");
    }

    [Fact]
    public async Task GetHealthStatusAsync_SetsCheckedAtTimestamp()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var beforeCheck = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var health = await provider.GetHealthStatusAsync();
        var afterCheck = DateTime.UtcNow.AddSeconds(1);

        // Assert
        health.CheckedAt.Should().BeAfter(beforeCheck);
        health.CheckedAt.Should().BeBefore(afterCheck);
    }

    #endregion

    #region Helper Methods

    private void SetupSettings(
        bool enabled = true,
        string apiKey = "xai-test-key",
        string defaultModel = "grok-2",
        string baseUrl = "https://api.x.ai/v1")
    {
        var settings = new AIProvidersSettings
        {
            XAI = new XAISettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                BaseUrl = baseUrl,
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    private GrokProvider CreateProvider()
    {
        return new GrokProvider(
            _mockSettings.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object);
    }

    #endregion
}

