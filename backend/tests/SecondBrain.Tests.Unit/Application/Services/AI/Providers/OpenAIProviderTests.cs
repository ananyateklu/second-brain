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
/// Unit tests for OpenAIProvider.
/// Tests provider behavior, disabled states, health checks, and static helper methods.
/// </summary>
public class OpenAIProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockOptions;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<OpenAIProvider>> _mockLogger;

    public OpenAIProviderTests()
    {
        _mockOptions = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<OpenAIProvider>>();
    }

    #region Provider Initialization Tests

    [Fact]
    public void Constructor_WhenProviderDisabled_IsEnabledReturnsFalse()
    {
        // Arrange
        var settings = CreateSettings(enabled: false, apiKey: "sk-test-key");
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
        provider.ProviderName.Should().Be("OpenAI");
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
        result.Provider.Should().Be("OpenAI");
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
        result.Provider.Should().Be("OpenAI");
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
        health.Provider.Should().Be("OpenAI");
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
        var client = provider.CreateChatClient("gpt-4");

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
        var client = provider.CreateChatClient("gpt-4");

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
        var events = new List<OpenAIToolStreamEvent>();
        await foreach (var evt in provider.StreamWithToolsAsync(messages, tools, "gpt-4"))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(OpenAIToolStreamEventType.Error);
        events.First().Error.Should().Contain("not enabled");
    }

    #endregion

    #region Static Helper Methods Tests

    [Fact]
    public void ConvertToOpenAIMessagePublic_WithUserMessage_ReturnsUserChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "user", Content = "Hello" };

        // Act
        var result = OpenAIProvider.ConvertToOpenAIMessagePublic(message);

        // Assert
        result.Should().BeOfType<UserChatMessage>();
    }

    [Fact]
    public void ConvertToOpenAIMessagePublic_WithSystemMessage_ReturnsSystemChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "system", Content = "You are helpful" };

        // Act
        var result = OpenAIProvider.ConvertToOpenAIMessagePublic(message);

        // Assert
        result.Should().BeOfType<SystemChatMessage>();
    }

    [Fact]
    public void ConvertToOpenAIMessagePublic_WithAssistantMessage_ReturnsAssistantChatMessage()
    {
        // Arrange
        var message = new ChatMessage { Role = "assistant", Content = "Hello there!" };

        // Act
        var result = OpenAIProvider.ConvertToOpenAIMessagePublic(message);

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
        var message = OpenAIProvider.CreateToolResultMessage(toolCallId, result);

        // Assert
        message.Should().BeOfType<ToolChatMessage>();
    }

    [Fact]
    public void CreateAssistantToolCallMessage_WithoutText_ReturnsAssistantChatMessage()
    {
        // Arrange
        var toolCalls = new List<OpenAIToolCallInfo>
        {
            new() { Id = "call_1", Name = "get_weather", Arguments = "{\"city\":\"NYC\"}" }
        };

        // Act
        var message = OpenAIProvider.CreateAssistantToolCallMessage(toolCalls);

        // Assert
        message.Should().BeOfType<AssistantChatMessage>();
    }

    [Fact]
    public void CreateAssistantToolCallMessage_WithText_ReturnsAssistantChatMessageWithContent()
    {
        // Arrange
        var toolCalls = new List<OpenAIToolCallInfo>
        {
            new() { Id = "call_1", Name = "search", Arguments = "{}" }
        };
        var textContent = "Let me search for that...";

        // Act
        var message = OpenAIProvider.CreateAssistantToolCallMessage(toolCalls, textContent);

        // Assert
        message.Should().BeOfType<AssistantChatMessage>();
    }

    #endregion

    #region HttpClientName Constant Test

    [Fact]
    public void HttpClientName_HasCorrectValue()
    {
        // Assert
        OpenAIProvider.HttpClientName.Should().Be("OpenAI");
    }

    #endregion

    #region Settings Override Tests

    [Theory]
    [InlineData("gpt-4o")]
    [InlineData("gpt-4-turbo")]
    [InlineData("gpt-3.5-turbo")]
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
        result.Provider.Should().Be("OpenAI");
    }

    #endregion

    #region Helper Methods

    private OpenAIProvider CreateProvider()
    {
        return new OpenAIProvider(
            _mockOptions.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object);
    }

    private static AIProvidersSettings CreateSettings(
        bool enabled = false,
        string? apiKey = null,
        string defaultModel = "gpt-4")
    {
        return new AIProvidersSettings
        {
            OpenAI = new OpenAISettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                DefaultModel = defaultModel,
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
    }

    #endregion
}
