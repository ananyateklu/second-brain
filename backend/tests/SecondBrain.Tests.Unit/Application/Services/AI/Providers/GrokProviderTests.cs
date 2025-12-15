using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using OpenAI.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using Xunit;
using ChatMessage = SecondBrain.Application.Services.AI.Models.ChatMessage;

namespace SecondBrain.Tests.Unit.Application.Services.AI.Providers;

/// <summary>
/// Unit tests for GrokProvider (X.AI).
/// Tests provider behavior, disabled states, health checks, and static helper methods.
/// </summary>
public class GrokProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockOptions;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<GrokProvider>> _mockLogger;

    public GrokProviderTests()
    {
        _mockOptions = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<GrokProvider>>();
    }

    #region Provider Initialization Tests

    [Fact]
    public void Constructor_WhenProviderDisabled_IsEnabledReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "xai-test-key");
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
        provider.ProviderName.Should().Be("Grok");
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
        result.Provider.Should().Be("Grok");
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
        result.Provider.Should().Be("Grok");
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
        health.Provider.Should().Be("Grok");
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

    #region CreateChatClient Tests

    [Fact]
    public void CreateChatClient_WhenDisabled_ReturnsNull()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var client = provider.CreateChatClient("grok-2");

        // Assert
        client.Should().BeNull();
    }

    [Fact]
    public void CreateChatClient_WhenApiKeyEmpty_ReturnsNull()
    {
        // Arrange
        var settings = CreateSettings(enabled: true, apiKey: "");
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();

        // Act
        var client = provider.CreateChatClient("grok-2");

        // Assert
        client.Should().BeNull();
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
        var messages = new List<OpenAI.Chat.ChatMessage>();
        var tools = new List<ChatTool>();

        // Act
        var events = new List<GrokToolStreamEvent>();
        await foreach (var evt in provider.StreamWithToolsAsync(messages, tools, "grok-2"))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(GrokToolStreamEventType.Error);
        events.First().Error.Should().Contain("not enabled");
    }

    #endregion

    #region GenerateWithThinkModeAsync Tests - Disabled State

    [Fact]
    public async Task GenerateWithThinkModeAsync_WhenDisabled_ReturnsFailure()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };
        var thinkOptions = new GrokThinkModeOptions { Enabled = true, Effort = "high" };

        // Act
        var result = await provider.GenerateWithThinkModeAsync(messages, thinkOptions);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Grok");
    }

    #endregion

    #region StreamWithThinkModeAsync Tests - Disabled State

    [Fact]
    public async Task StreamWithThinkModeAsync_WhenDisabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = CreateSettings(enabled: false);
        _mockOptions.Setup(o => o.Value).Returns(settings);
        var provider = CreateProvider();
        var messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } };
        var thinkOptions = new GrokThinkModeOptions { Enabled = true, Effort = "medium" };

        // Act
        var events = new List<GrokToolStreamEvent>();
        await foreach (var evt in provider.StreamWithThinkModeAsync(messages, thinkOptions))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(GrokToolStreamEventType.Error);
        events.First().Error.Should().Contain("not enabled");
    }

    #endregion

    #region Static Helper Methods Tests

    [Fact]
    public void ConvertToGrokMessagePublic_WithUserMessage_ReturnsUserChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "user", Content = "Hello" };

        // Act
        var result = GrokProvider.ConvertToGrokMessagePublic(message);

        // Assert
        result.Should().BeOfType<UserChatMessage>();
    }

    [Fact]
    public void ConvertToGrokMessagePublic_WithSystemMessage_ReturnsSystemChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "system", Content = "You are helpful" };

        // Act
        var result = GrokProvider.ConvertToGrokMessagePublic(message);

        // Assert
        result.Should().BeOfType<SystemChatMessage>();
    }

    [Fact]
    public void ConvertToGrokMessagePublic_WithAssistantMessage_ReturnsAssistantChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "assistant", Content = "Hello there!" };

        // Act
        var result = GrokProvider.ConvertToGrokMessagePublic(message);

        // Assert
        result.Should().BeOfType<AssistantChatMessage>();
    }

    [Fact]
    public void CreateToolResultMessage_ReturnsToolChatMessage()
    {
        // Arrange
        var toolCallId = "call_123";
        var result = "Tool execution result";

        // Act
        var message = GrokProvider.CreateToolResultMessage(toolCallId, result);

        // Assert
        message.Should().BeOfType<ToolChatMessage>();
    }

    [Fact]
    public void CreateAssistantToolCallMessage_WithoutText_ReturnsAssistantChatMessage()
    {
        // Arrange
        var toolCalls = new List<GrokToolCallInfo>
        {
            new() { Id = "call_1", Name = "search", Arguments = "{\"query\":\"test\"}" }
        };

        // Act
        var message = GrokProvider.CreateAssistantToolCallMessage(toolCalls);

        // Assert
        message.Should().BeOfType<AssistantChatMessage>();
    }

    [Fact]
    public void CreateAssistantToolCallMessage_WithText_ReturnsAssistantChatMessageWithContent()
    {
        // Arrange
        var toolCalls = new List<GrokToolCallInfo>
        {
            new() { Id = "call_1", Name = "search", Arguments = "{}" }
        };
        var textContent = "Let me search for that...";

        // Act
        var message = GrokProvider.CreateAssistantToolCallMessage(toolCalls, textContent);

        // Assert
        message.Should().BeOfType<AssistantChatMessage>();
    }

    #endregion

    #region HttpClientName Constant Test

    [Fact]
    public void HttpClientName_HasCorrectValue()
    {
        // Assert
        GrokProvider.HttpClientName.Should().Be("Grok");
    }

    #endregion

    #region Settings Override Tests

    [Theory]
    [InlineData("grok-2")]
    [InlineData("grok-2-1212")]
    [InlineData("grok-2-vision-1212")]
    [InlineData("grok-beta")]
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
        result.Provider.Should().Be("Grok");
    }

    #endregion

    #region Helper Methods

    private GrokProvider CreateProvider()
    {
        return new GrokProvider(
            _mockOptions.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object);
    }

    private static AIProvidersSettings CreateSettings(
        bool enabled = false,
        string? apiKey = null,
        string defaultModel = "grok-2")
    {
        return new AIProvidersSettings
        {
            XAI = new XAISettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = 4096,
                Temperature = 0.7f,
                BaseUrl = "https://api.x.ai/v1"
            }
        };
    }

    #endregion
}
