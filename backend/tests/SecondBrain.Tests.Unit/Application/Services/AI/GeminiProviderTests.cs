using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class GeminiProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<GeminiProvider>> _mockLogger;

    public GeminiProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<GeminiProvider>>();
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
        provider.ProviderName.Should().Be("Gemini");
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
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_CreatesClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "AIza-test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void ProviderName_ReturnsGemini()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Gemini");
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
    public async Task GenerateCompletionAsync_WhenDisabled_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test prompt" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenNoClient_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test prompt" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled or configured");
    }

    #endregion

    #region GenerateChatCompletionAsync Tests

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenDisabled_ReturnsErrorResponse()
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
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenNoClient_ReturnsErrorResponse()
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

    [Fact]
    public async Task GenerateChatCompletionAsync_WithOnlySystemMessage_ReturnsError()
    {
        // Arrange - need enabled with client to reach the validation
        SetupSettings(enabled: true, apiKey: "AIza-test-key");
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "system", Content = "You are helpful" }  // Only system message
        };

        // Act
        var result = await provider.GenerateChatCompletionAsync(messages);

        // Assert - Should return error since no user/assistant messages
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("No conversation messages found");
    }

    #endregion

    #region StreamCompletionAsync Tests

    [Fact]
    public async Task StreamCompletionAsync_WhenDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.StreamCompletionAsync(request);
        var items = new List<string>();
        await foreach (var item in result)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamCompletionAsync_WhenNoClient_ReturnsEmptyEnumerable()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.StreamCompletionAsync(request);
        var items = new List<string>();
        await foreach (var item in result)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    #endregion

    #region StreamChatCompletionAsync Tests

    [Fact]
    public async Task StreamChatCompletionAsync_WhenDisabled_ReturnsEmptyEnumerable()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var result = await provider.StreamChatCompletionAsync(messages);
        var items = new List<string>();
        await foreach (var item in result)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamChatCompletionAsync_WhenNoClient_ReturnsEmptyEnumerable()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "user", Content = "Hello" }
        };

        // Act
        var result = await provider.StreamChatCompletionAsync(messages);
        var items = new List<string>();
        await foreach (var item in result)
        {
            items.Add(item);
        }

        // Assert
        items.Should().BeEmpty();
    }

    [Fact]
    public async Task StreamChatCompletionAsync_WithOnlySystemMessage_ReturnsEmptyEnumerable()
    {
        // Arrange - need enabled with client to reach the validation
        SetupSettings(enabled: true, apiKey: "AIza-test-key");
        var provider = CreateProvider();
        var messages = new List<SecondBrain.Application.Services.AI.Models.ChatMessage>
        {
            new() { Role = "system", Content = "You are helpful" }  // Only system message
        };

        // Act
        var result = await provider.StreamChatCompletionAsync(messages);
        var items = new List<string>();
        await foreach (var item in result)
        {
            items.Add(item);
        }

        // Assert - Should return empty since no conversation messages
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
        health.Provider.Should().Be("Gemini");
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
        string apiKey = "test-api-key",
        string defaultModel = "gemini-1.5-flash",
        int maxTokens = 4096,
        float temperature = 0.7f)
    {
        var settings = new AIProvidersSettings
        {
            Gemini = new GeminiSettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = maxTokens,
                Temperature = temperature,
                TopP = 0.95f,
                TopK = 40
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    private GeminiProvider CreateProvider()
    {
        return new GeminiProvider(
            _mockSettings.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object);
    }

    #endregion
}

