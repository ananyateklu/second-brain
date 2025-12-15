using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Strategies;

/// <summary>
/// Unit tests for GrokStreamingStrategy.
/// Tests provider detection, capability handling, and configuration validation.
/// </summary>
public class GrokStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IRagContextInjector> _mockRagInjector;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly Mock<ILogger<GrokStreamingStrategy>> _mockLogger;

    public GrokStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockRagInjector = new Mock<IRagContextInjector>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();
        _mockLogger = new Mock<ILogger<GrokStreamingStrategy>>();
    }

    private GrokStreamingStrategy CreateStrategy(GrokProvider? provider = null)
    {
        return new GrokStreamingStrategy(
            provider,
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockRagInjector.Object,
            _mockToolBuilder.Object,
            _mockRetryPolicy.Object,
            _mockLogger.Object);
    }

    #region SupportedProviders Tests

    [Fact]
    public void SupportedProviders_ContainsGrok()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("grok");
    }

    [Fact]
    public void SupportedProviders_ContainsXai()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("xai");
    }

    [Fact]
    public void SupportedProviders_HasTwoProviders()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().HaveCount(2);
    }

    #endregion

    #region CanHandle Tests

    [Fact]
    public void CanHandle_WhenProviderIsNull_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(provider: null);
        var request = new AgentRequest
        {
            Provider = "grok",
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(enabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("claude")]
    [InlineData("anthropic")]
    [InlineData("gemini")]
    [InlineData("ollama")]
    public void CanHandle_WhenProviderDoesNotMatch_ReturnsFalse(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGrokProvider());
        var request = new AgentRequest
        {
            Provider = provider,
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(enabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenXaiDisabled_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGrokProvider());
        var request = new AgentRequest
        {
            Provider = "grok",
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(enabled: false);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenNoCapabilities_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGrokProvider());
        var request = new AgentRequest
        {
            Provider = "grok",
            Capabilities = new List<string>()
        };
        var settings = CreateSettings(enabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenCapabilitiesIsNull_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGrokProvider());
        var request = new AgentRequest
        {
            Provider = "grok",
            Capabilities = null
        };
        var settings = CreateSettings(enabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("grok")]
    [InlineData("Grok")]
    [InlineData("GROK")]
    [InlineData("xai")]
    [InlineData("XAI")]
    [InlineData("Xai")]
    public void CanHandle_WhenAllConditionsMet_ReturnsTrue(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGrokProvider());
        var request = new AgentRequest
        {
            Provider = provider,
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(enabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region ProcessAsync Error Handling Tests

    [Fact]
    public async Task ProcessAsync_WhenProviderIsNull_YieldsErrorEvent()
    {
        // Arrange
        var sut = CreateStrategy(provider: null);
        var context = CreateContext();

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().ContainSingle();
        events.First().Type.Should().Be(AgentEventType.Error);
        events.First().Content.Should().Contain("not properly configured");
    }

    #endregion

    #region Helper Methods

    private static GrokProvider? CreateMockGrokProvider()
    {
        try
        {
            return new GrokProvider(
                Microsoft.Extensions.Options.Options.Create(new AIProvidersSettings
                {
                    XAI = new XAISettings
                    {
                        Enabled = true,
                        ApiKey = "test-key"
                    }
                }),
                Mock.Of<IHttpClientFactory>(),
                Mock.Of<ILogger<GrokProvider>>());
        }
        catch
        {
            return null;
        }
    }

    private static AIProvidersSettings CreateSettings(bool enabled)
    {
        return new AIProvidersSettings
        {
            XAI = new XAISettings
            {
                Enabled = enabled,
                ApiKey = "test-api-key",
                FunctionCalling = new GrokFunctionCallingConfig
                {
                    MaxIterations = 10,
                    ParallelExecution = true
                }
            }
        };
    }

    private static AgentStreamingContext CreateContext()
    {
        return new AgentStreamingContext
        {
            Request = new AgentRequest
            {
                Provider = "grok",
                Model = "grok-3-mini",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Hello" }
                },
                UserId = "test-user",
                Capabilities = new List<string> { "notes" }
            },
            Settings = new AIProvidersSettings
            {
                XAI = new XAISettings
                {
                    Enabled = true,
                    ApiKey = "test-key",
                    FunctionCalling = new GrokFunctionCallingConfig
                    {
                        MaxIterations = 10,
                        ParallelExecution = true
                    }
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
