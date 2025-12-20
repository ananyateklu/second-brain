using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Strategies;

/// <summary>
/// Unit tests for AnthropicStreamingStrategy.
/// Tests provider detection, capability handling, and configuration validation.
/// </summary>
public class AnthropicStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly Mock<ILogger<AnthropicStreamingStrategy>> _mockLogger;
    private readonly AnthropicStreamingStrategy _sut;

    public AnthropicStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();
        _mockLogger = new Mock<ILogger<AnthropicStreamingStrategy>>();

        _sut = new AnthropicStreamingStrategy(
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockToolBuilder.Object,
            _mockRetryPolicy.Object,
            _mockLogger.Object);
    }

    #region SupportedProviders Tests

    [Fact]
    public void SupportedProviders_ContainsClaude()
    {
        // Act & Assert
        _sut.SupportedProviders.Should().Contain("claude");
    }

    [Fact]
    public void SupportedProviders_ContainsAnthropic()
    {
        // Act & Assert
        _sut.SupportedProviders.Should().Contain("anthropic");
    }

    [Fact]
    public void SupportedProviders_HasTwoProviders()
    {
        // Act & Assert
        _sut.SupportedProviders.Should().HaveCount(2);
    }

    #endregion

    #region CanHandle Tests

    [Theory]
    [InlineData("claude")]
    [InlineData("Claude")]
    [InlineData("CLAUDE")]
    [InlineData("anthropic")]
    [InlineData("Anthropic")]
    [InlineData("ANTHROPIC")]
    public void CanHandle_WhenProviderMatchesAndEnabled_ReturnsTrue(string provider)
    {
        // Arrange
        var request = new AgentRequest { Provider = provider };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = "test-api-key"
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("gemini")]
    [InlineData("grok")]
    [InlineData("ollama")]
    [InlineData("unknown")]
    public void CanHandle_WhenProviderDoesNotMatch_ReturnsFalse(string provider)
    {
        // Arrange
        var request = new AgentRequest { Provider = provider };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = "test-api-key"
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenProviderDisabled_ReturnsFalse()
    {
        // Arrange
        var request = new AgentRequest { Provider = "claude" };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = false,
                ApiKey = "test-api-key"
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenApiKeyMissing_ReturnsFalse()
    {
        // Arrange
        var request = new AgentRequest { Provider = "claude" };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = ""
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenApiKeyIsNull_ReturnsFalse()
    {
        // Arrange
        var request = new AgentRequest { Provider = "anthropic" };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = null
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenAllConditionsMet_ReturnsTrue()
    {
        // Arrange
        var request = new AgentRequest { Provider = "claude" };
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = "sk-ant-test-key"
            }
        };

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region ProcessAsync Error Handling Tests

    [Fact]
    public async Task ProcessAsync_WhenProviderDisabled_YieldsErrorEvent()
    {
        // Arrange
        var context = CreateContext(enabled: false, apiKey: "test-key");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(AgentEventType.Error);
        events.First().Content.Should().Contain("not enabled");
    }

    [Fact]
    public async Task ProcessAsync_WhenApiKeyMissing_YieldsErrorEvent()
    {
        // Arrange
        var context = CreateContext(enabled: true, apiKey: "");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(AgentEventType.Error);
        events.First().Content.Should().Contain("not enabled or configured");
    }

    [Fact]
    public async Task ProcessAsync_WhenApiKeyNull_YieldsErrorEvent()
    {
        // Arrange
        var context = CreateContext(enabled: true, apiKey: null);

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(AgentEventType.Error);
    }

    #endregion

    #region Helper Methods

    private static AgentStreamingContext CreateContext(bool enabled, string? apiKey)
    {
        return new AgentStreamingContext
        {
            Request = new AgentRequest
            {
                Provider = "claude",
                Model = "claude-3-opus-20240229",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Hello" }
                },
                UserId = "test-user"
            },
            Settings = new AIProvidersSettings
            {
                Anthropic = new AnthropicSettings
                {
                    Enabled = enabled,
                    ApiKey = apiKey,
                    Features = new AnthropicFeaturesConfig(),
                    Caching = new AnthropicCachingConfig(),
                    Thinking = new AnthropicThinkingConfig()
                }
            },
            RagSettings = new RagSettings(),
            Plugins = new Dictionary<string, IAgentPlugin>(),
            Logger = Mock.Of<ILogger>(),
            RagService = Mock.Of<IRagService>(),
            UserPreferencesService = Mock.Of<IUserPreferencesService>(),
            GetSystemPrompt = _ => "You are a helpful assistant."
        };
    }

    #endregion
}
