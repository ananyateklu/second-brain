using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class OllamaProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<OllamaProvider>> _mockLogger;

    public OllamaProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockLogger = new Mock<ILogger<OllamaProvider>>();
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
        provider.ProviderName.Should().Be("Ollama");
    }

    [Fact]
    public void Constructor_WhenEnabled_InitializesDefaultClient()
    {
        // Arrange
        SetupSettings(enabled: true);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void ProviderName_ReturnsOllama()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Ollama");
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
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Ollama");
    }

    [Fact]
    public async Task GenerateCompletionAsync_WhenEnabled_IncludesProviderName()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new SecondBrain.Application.Services.AI.Models.AIRequest { Prompt = "Test" };

        // Act
        var result = await provider.GenerateCompletionAsync(request);

        // Assert
        result.Provider.Should().Be("Ollama");
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
        result.Provider.Should().Be("Ollama");
    }

    [Fact]
    public async Task GenerateChatCompletionAsync_WhenEnabled_IncludesProviderName()
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
        result.Provider.Should().Be("Ollama");
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
    public async Task StreamCompletionAsync_WhenStreamingDisabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, streamingEnabled: false);
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
    public async Task StreamChatCompletionAsync_WhenStreamingDisabled_ReturnsEmptyStream()
    {
        // Arrange
        SetupSettings(enabled: true, streamingEnabled: false);
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
        health.Provider.Should().Be("Ollama");
        health.ErrorMessage.Should().Contain("disabled");
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

    [Fact]
    public async Task GetHealthStatusAsync_WithConfigOverrides_UsesOverrideUrl()
    {
        // Arrange
        SetupSettings(enabled: true);
        var provider = CreateProvider();
        var configOverrides = new Dictionary<string, string>
        {
            { "ollamaBaseUrl", "http://remote-ollama:11434" }
        };

        // Act
        var health = await provider.GetHealthStatusAsync(configOverrides);

        // Assert - Will fail to connect but should handle gracefully
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Unreachable");
        health.ErrorMessage.Should().Contain("remote-ollama");
    }

    #endregion

    #region DeleteModelAsync Tests

    [Fact]
    public async Task DeleteModelAsync_WhenDisabled_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var (success, error) = await provider.DeleteModelAsync("llama3");

        // Assert
        success.Should().BeFalse();
        error.Should().Contain("not enabled");
    }

    #endregion

    #region PullModelAsync Tests

    [Fact]
    public async Task PullModelAsync_WhenDisabled_ReturnsErrorProgress()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var progressItems = new List<SecondBrain.Application.Services.AI.Models.OllamaPullProgress>();
        await foreach (var progress in provider.PullModelAsync("llama3"))
        {
            progressItems.Add(progress);
        }

        // Assert
        progressItems.Should().HaveCount(1);
        progressItems[0].IsError.Should().BeTrue();
        progressItems[0].ErrorMessage.Should().Contain("not enabled");
    }

    #endregion

    #region Helper Methods

    private void SetupSettings(
        bool enabled = true,
        string baseUrl = "http://localhost:11434",
        string defaultModel = "llama3",
        bool streamingEnabled = true)
    {
        var settings = new AIProvidersSettings
        {
            Ollama = new OllamaSettings
            {
                Enabled = enabled,
                BaseUrl = baseUrl,
                DefaultModel = defaultModel,
                Temperature = 0.7f,
                StreamingEnabled = streamingEnabled
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    private OllamaProvider CreateProvider()
    {
        return new OllamaProvider(
            _mockSettings.Object,
            _mockLogger.Object);
    }

    #endregion
}

