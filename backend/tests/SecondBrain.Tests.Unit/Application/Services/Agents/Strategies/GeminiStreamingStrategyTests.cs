using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.AI.FileManagement;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Strategies;

/// <summary>
/// Unit tests for GeminiStreamingStrategy.
/// Tests provider detection, capability handling, and configuration validation.
/// </summary>
public class GeminiStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly Mock<ILogger<GeminiStreamingStrategy>> _mockLogger;

    public GeminiStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();
        _mockLogger = new Mock<ILogger<GeminiStreamingStrategy>>();
    }

    private GeminiStreamingStrategy CreateStrategy(GeminiProvider? provider = null)
    {
        return new GeminiStreamingStrategy(
            provider,
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockToolBuilder.Object,
            _mockRetryPolicy.Object,
            _mockLogger.Object);
    }

    #region SupportedProviders Tests

    [Fact]
    public void SupportedProviders_ContainsGemini()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("gemini");
    }

    [Fact]
    public void SupportedProviders_HasSingleProvider()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().ContainSingle();
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
            Provider = "gemini",
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(functionCallingEnabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("claude")]
    [InlineData("anthropic")]
    [InlineData("grok")]
    [InlineData("ollama")]
    public void CanHandle_WhenProviderDoesNotMatch_ReturnsFalse(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGeminiProvider());
        var request = new AgentRequest
        {
            Provider = provider,
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(functionCallingEnabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenFunctionCallingDisabled_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGeminiProvider());
        var request = new AgentRequest
        {
            Provider = "gemini",
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(functionCallingEnabled: false);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenNoCapabilities_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGeminiProvider());
        var request = new AgentRequest
        {
            Provider = "gemini",
            Capabilities = new List<string>()
        };
        var settings = CreateSettings(functionCallingEnabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WhenCapabilitiesIsNull_ReturnsFalse()
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGeminiProvider());
        var request = new AgentRequest
        {
            Provider = "gemini",
            Capabilities = null
        };
        var settings = CreateSettings(functionCallingEnabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("gemini")]
    [InlineData("Gemini")]
    [InlineData("GEMINI")]
    public void CanHandle_WhenAllConditionsMet_ReturnsTrue(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockGeminiProvider());
        var request = new AgentRequest
        {
            Provider = provider,
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateSettings(functionCallingEnabled: true);

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

    private static GeminiProvider? CreateMockGeminiProvider()
    {
        try
        {
            return new GeminiProvider(
                Microsoft.Extensions.Options.Options.Create(new AIProvidersSettings
                {
                    Gemini = new GeminiSettings
                    {
                        Enabled = true,
                        ApiKey = "test-key",
                        Features = new GeminiFeaturesConfig { EnableFunctionCalling = true }
                    }
                }),
                Mock.Of<IHttpClientFactory>(),
                Mock.Of<IGeminiFileService>(),
                Mock.Of<ILogger<GeminiProvider>>());
        }
        catch
        {
            return null;
        }
    }

    private static AIProvidersSettings CreateSettings(bool functionCallingEnabled)
    {
        return new AIProvidersSettings
        {
            Gemini = new GeminiSettings
            {
                Enabled = true,
                ApiKey = "test-api-key",
                Features = new GeminiFeaturesConfig
                {
                    EnableFunctionCalling = functionCallingEnabled
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
                Provider = "gemini",
                Model = "gemini-pro",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Hello" }
                },
                UserId = "test-user",
                Capabilities = new List<string> { "notes" }
            },
            Settings = new AIProvidersSettings
            {
                Gemini = new GeminiSettings
                {
                    Enabled = true,
                    ApiKey = "test-key",
                    Features = new GeminiFeaturesConfig { EnableFunctionCalling = true }
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
