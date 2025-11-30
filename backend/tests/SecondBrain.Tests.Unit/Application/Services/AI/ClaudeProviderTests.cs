using Anthropic.SDK;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class ClaudeProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<IAnthropicClientFactory> _mockClientFactory;
    private readonly Mock<ILogger<ClaudeProvider>> _mockLogger;

    public ClaudeProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockClientFactory = new Mock<IAnthropicClientFactory>();
        _mockLogger = new Mock<ILogger<ClaudeProvider>>();
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WhenDisabled_DoesNotCreateClient()
    {
        // Arrange
        SetupSettings(enabled: false, apiKey: "test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenEnabledWithNoApiKey_DoesNotCreateClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_CreatesClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test-api-key");
        _mockClientFactory.Setup(f => f.CreateClient("test-api-key"))
            .Returns((AnthropicClient?)null);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
        _mockClientFactory.Verify(f => f.CreateClient("test-api-key"), Times.Once);
    }

    [Fact]
    public void ProviderName_ReturnsClaude()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Claude");
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
    public async Task GenerateCompletionAsync_WhenNotEnabled_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Claude");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenClientNull_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    #endregion

    #region GenerateChatCompletionAsync Tests

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenNotEnabled_ReturnsErrorResponse()
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
        result.Provider.Should().Be("Claude");
    }

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenClientNull_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

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
    }

    #endregion

    #region StreamCompletionAsync Tests

    [Fact]
    public async Task StreamCompletionAsync_WhenNotEnabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var stream = await provider.StreamCompletionAsync(request);
        var tokens = new List<string>();
        await foreach (var token in stream)
        {
            tokens.Add(token);
        }

        // Assert
        tokens.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamCompletionAsync_WhenClientNull_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var stream = await provider.StreamCompletionAsync(request);
        var tokens = new List<string>();
        await foreach (var token in stream)
        {
            tokens.Add(token);
        }

        // Assert
        tokens.Should().BeEmpty();
    }

    #endregion

    #region StreamChatCompletionAsync Tests

    [Fact]
    public async Task StreamChatCompletionAsync_WhenNotEnabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);
        var tokens = new List<string>();
        await foreach (var token in stream)
        {
            tokens.Add(token);
        }

        // Assert
        tokens.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamChatCompletionAsync_WhenClientNull_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var stream = await provider.StreamChatCompletionAsync(messages);
        var tokens = new List<string>();
        await foreach (var token in stream)
        {
            tokens.Add(token);
        }

        // Assert
        tokens.Should().BeEmpty();
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenNotEnabled_ReturnsFalse()
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
    public async Task IsAvailableAsync_WhenClientNull_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
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
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var result = await provider.GetHealthStatusAsync();

        // Assert
        result.Provider.Should().Be("Claude");
        result.IsHealthy.Should().BeFalse();
        result.Status.Should().Be("Disabled");
        result.ErrorMessage.Should().Contain("disabled");
    }

    [Fact]
    public async Task GetHealthStatusAsync_WhenClientNull_ReturnsNotConfiguredStatus()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns((AnthropicClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.GetHealthStatusAsync();

        // Assert
        result.Provider.Should().Be("Claude");
        result.IsHealthy.Should().BeFalse();
        result.Status.Should().Be("Not Configured");
        result.ErrorMessage.Should().Contain("API key");
    }

    [Fact]
    public async Task GetHealthStatusAsync_SetsCheckedAtTimestamp()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var beforeCheck = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var result = await provider.GetHealthStatusAsync();
        var afterCheck = DateTime.UtcNow.AddSeconds(1);

        // Assert
        result.CheckedAt.Should().BeAfter(beforeCheck);
        result.CheckedAt.Should().BeBefore(afterCheck);
    }

    #endregion

    #region Helper Methods

    private ClaudeProvider CreateProvider()
    {
        return new ClaudeProvider(
            _mockSettings.Object,
            _mockHttpClientFactory.Object,
            _mockClientFactory.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(bool enabled = false, string apiKey = "", string defaultModel = "claude-3-sonnet-20240229")
    {
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

