using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
/// Unit tests for SemanticKernelStreamingStrategy.
/// Tests provider detection, fallback behavior, and kernel initialization errors.
/// </summary>
public class SemanticKernelStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IRagContextInjector> _mockRagInjector;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly Mock<ILogger<SemanticKernelStreamingStrategy>> _mockLogger;

    public SemanticKernelStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockRagInjector = new Mock<IRagContextInjector>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();
        _mockLogger = new Mock<ILogger<SemanticKernelStreamingStrategy>>();
    }

    private SemanticKernelStreamingStrategy CreateStrategy(AIProvidersSettings? settings = null)
    {
        settings ??= CreateDefaultSettings();
        return new SemanticKernelStreamingStrategy(
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockRagInjector.Object,
            _mockToolBuilder.Object,
            _mockRetryPolicy.Object,
            Options.Create(settings),
            _mockLogger.Object);
    }

    #region SupportedProviders Tests

    [Fact]
    public void SupportedProviders_ContainsOpenAI()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("openai");
    }

    [Fact]
    public void SupportedProviders_ContainsGemini()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("gemini");
    }

    [Fact]
    public void SupportedProviders_ContainsOllama()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().Contain("ollama");
    }

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
    public void SupportedProviders_HasFiveProviders()
    {
        // Arrange
        var sut = CreateStrategy();

        // Act & Assert
        sut.SupportedProviders.Should().HaveCount(5);
    }

    #endregion

    #region CanHandle Tests - Fallback Behavior

    [Theory]
    [InlineData("openai")]
    [InlineData("gemini")]
    [InlineData("ollama")]
    [InlineData("grok")]
    [InlineData("xai")]
    [InlineData("claude")]
    [InlineData("anthropic")]
    [InlineData("unknown")]
    public void CanHandle_AlwaysReturnsFalse_BecauseIsFallbackStrategy(string provider)
    {
        // Arrange
        var sut = CreateStrategy();
        var request = new AgentRequest
        {
            Provider = provider,
            Capabilities = new List<string> { "notes" }
        };
        var settings = CreateDefaultSettings();

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        // This is intentional - SemanticKernelStreamingStrategy is a fallback
        // that the factory uses when no native strategy matches
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_ReturnsFalse_EvenWithValidCapabilities()
    {
        // Arrange
        var sut = CreateStrategy();
        var request = new AgentRequest
        {
            Provider = "openai",
            Capabilities = new List<string> { "notes", "search" }
        };
        var settings = CreateDefaultSettings();

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_ReturnsFalse_WithNullCapabilities()
    {
        // Arrange
        var sut = CreateStrategy();
        var request = new AgentRequest
        {
            Provider = "openai",
            Capabilities = null
        };
        var settings = CreateDefaultSettings();

        // Act
        var result = sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region ProcessAsync Error Handling Tests

    [Fact]
    public async Task ProcessAsync_WhenOpenAINotEnabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false, ApiKey = "test-key" }
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("openai");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("not enabled or configured");
    }

    [Fact]
    public async Task ProcessAsync_WhenOpenAIApiKeyMissing_YieldsErrorEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = true, ApiKey = "" }
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("openai");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessAsync_WhenGeminiNotEnabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Gemini = new GeminiSettings { Enabled = false, ApiKey = "test-key" }
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("gemini");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("Gemini provider is not enabled");
    }

    [Fact]
    public async Task ProcessAsync_WhenXaiNotEnabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            XAI = new XAISettings { Enabled = false, ApiKey = "test-key" }
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("grok");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("xAI/Grok provider is not enabled");
    }

    [Fact]
    public async Task ProcessAsync_WhenOllamaNotEnabled_YieldsErrorEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Ollama = new OllamaSettings { Enabled = false }
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("ollama");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("Ollama provider is not enabled");
    }

    [Theory]
    [InlineData("claude")]
    [InlineData("anthropic")]
    public async Task ProcessAsync_WhenAnthropicProvider_YieldsErrorEvent(string provider)
    {
        // Arrange
        var sut = CreateStrategy();
        var context = CreateContext(provider);

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("AnthropicStreamingStrategy");
    }

    [Fact]
    public async Task ProcessAsync_WhenUnknownProvider_YieldsErrorEvent()
    {
        // Arrange
        var sut = CreateStrategy();
        var context = CreateContext("unknown-provider");

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        events.First(e => e.Type == AgentEventType.Error).Content
            .Should().Contain("Unknown provider");
    }

    [Fact]
    public async Task ProcessAsync_WithCapabilities_YieldsStatusEventPreparingTools()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false, ApiKey = "" } // Will fail later
        };
        var sut = CreateStrategy(settings);
        var context = CreateContext("openai", capabilities: new List<string> { "notes" });

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in sut.ProcessAsync(context))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e =>
            e.Type == AgentEventType.Status &&
            e.Content!.Contains("Preparing tools"));
    }

    #endregion

    #region Helper Methods

    private static AIProvidersSettings CreateDefaultSettings()
    {
        return new AIProvidersSettings
        {
            OpenAI = new OpenAISettings
            {
                Enabled = true,
                ApiKey = "test-openai-key",
                Features = new OpenAIFeaturesConfig { EnableFunctionCalling = true }
            },
            Gemini = new GeminiSettings
            {
                Enabled = true,
                ApiKey = "test-gemini-key",
                Features = new GeminiFeaturesConfig { EnableFunctionCalling = true }
            },
            XAI = new XAISettings
            {
                Enabled = true,
                ApiKey = "test-xai-key"
            },
            Ollama = new OllamaSettings
            {
                Enabled = true,
                Features = new OllamaFeaturesConfig { EnableFunctionCalling = true }
            },
            Anthropic = new AnthropicSettings
            {
                Enabled = true,
                ApiKey = "test-anthropic-key"
            }
        };
    }

    private static AgentStreamingContext CreateContext(
        string provider,
        List<string>? capabilities = null)
    {
        return new AgentStreamingContext
        {
            Request = new AgentRequest
            {
                Provider = provider,
                Model = "test-model",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Hello" }
                },
                UserId = "test-user",
                Capabilities = capabilities ?? new List<string>()
            },
            Settings = CreateDefaultSettings(),
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
