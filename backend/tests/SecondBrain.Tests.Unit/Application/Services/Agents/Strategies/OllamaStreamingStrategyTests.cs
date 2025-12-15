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
/// Unit tests for OllamaStreamingStrategy.
/// Tests provider detection, capability handling, and configuration validation.
/// </summary>
public class OllamaStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IRagContextInjector> _mockRagInjector;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly Mock<ILogger<OllamaStreamingStrategy>> _mockLogger;

    public OllamaStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockRagInjector = new Mock<IRagContextInjector>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();
        _mockLogger = new Mock<ILogger<OllamaStreamingStrategy>>();
    }

    private OllamaStreamingStrategy CreateStrategy(OllamaProvider? provider = null)
    {
        return new OllamaStreamingStrategy(
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
    public void SupportedProviders_ContainsOllama()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("ollama");
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
            Provider = "ollama",
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
    [InlineData("gemini")]
    [InlineData("grok")]
    public void CanHandle_WhenProviderDoesNotMatch_ReturnsFalse(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockOllamaProvider());
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
        var sut = CreateStrategy(CreateMockOllamaProvider());
        var request = new AgentRequest
        {
            Provider = "ollama",
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
        var sut = CreateStrategy(CreateMockOllamaProvider());
        var request = new AgentRequest
        {
            Provider = "ollama",
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
        var sut = CreateStrategy(CreateMockOllamaProvider());
        var request = new AgentRequest
        {
            Provider = "ollama",
            Capabilities = null
        };
        var settings = CreateSettings(functionCallingEnabled: true);

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("ollama")]
    [InlineData("Ollama")]
    [InlineData("OLLAMA")]
    public void CanHandle_WhenAllConditionsMet_ReturnsTrue(string provider)
    {
        // Arrange
        var sut = CreateStrategy(CreateMockOllamaProvider());
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

    private static OllamaProvider? CreateMockOllamaProvider()
    {
        try
        {
            return new OllamaProvider(
                Microsoft.Extensions.Options.Options.Create(new AIProvidersSettings
                {
                    Ollama = new OllamaSettings
                    {
                        Enabled = true,
                        Features = new OllamaFeaturesConfig { EnableFunctionCalling = true }
                    }
                }),
                Mock.Of<ILogger<OllamaProvider>>());
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
            Ollama = new OllamaSettings
            {
                Enabled = true,
                Features = new OllamaFeaturesConfig
                {
                    EnableFunctionCalling = functionCallingEnabled
                },
                FunctionCalling = new OllamaFunctionCallingConfig
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
                Provider = "ollama",
                Model = "llama3.2",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Hello" }
                },
                UserId = "test-user",
                Capabilities = new List<string> { "notes" }
            },
            Settings = new AIProvidersSettings
            {
                Ollama = new OllamaSettings
                {
                    Enabled = true,
                    Features = new OllamaFeaturesConfig { EnableFunctionCalling = true },
                    FunctionCalling = new OllamaFunctionCallingConfig
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
