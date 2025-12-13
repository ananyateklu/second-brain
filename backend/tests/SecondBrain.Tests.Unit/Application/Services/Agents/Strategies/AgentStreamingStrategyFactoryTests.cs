using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Strategies;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Strategies;

public class AgentStreamingStrategyFactoryTests
{
    private readonly Mock<ILogger<AgentStreamingStrategyFactory>> _mockLogger;
    private readonly Mock<IAgentStreamingStrategy> _mockFallbackStrategy;
    private readonly AIProvidersSettings _settings;

    public AgentStreamingStrategyFactoryTests()
    {
        _mockLogger = new Mock<ILogger<AgentStreamingStrategyFactory>>();
        _settings = new AIProvidersSettings();

        // Use interface mock for fallback strategy - simpler and more flexible
        _mockFallbackStrategy = new Mock<IAgentStreamingStrategy>();
        _mockFallbackStrategy.Setup(s => s.SupportedProviders)
            .Returns(new[] { "openai", "gemini", "ollama", "grok", "xai" });
    }

    [Fact]
    public void GetStrategy_WhenStrategyCanHandle_ReturnsMatchingStrategy()
    {
        // Arrange
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(true);
        mockStrategy.Setup(s => s.SupportedProviders).Returns(new[] { "openai" });

        var strategies = new List<IAgentStreamingStrategy> { mockStrategy.Object };
        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = "openai" };

        // Act
        var result = factory.GetStrategy(request, _settings);

        // Assert
        result.Should().BeSameAs(mockStrategy.Object);
    }

    [Fact]
    public void GetStrategy_WhenNoStrategyCanHandle_ReturnsFallback()
    {
        // Arrange
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(false);

        var strategies = new List<IAgentStreamingStrategy> { mockStrategy.Object };
        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = "unknown-provider" };

        // Act
        var result = factory.GetStrategy(request, _settings);

        // Assert
        result.Should().BeSameAs(_mockFallbackStrategy.Object);
    }

    [Fact]
    public void GetStrategy_WithEmptyStrategies_ReturnsFallback()
    {
        // Arrange
        var strategies = new List<IAgentStreamingStrategy>();
        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = "any" };

        // Act
        var result = factory.GetStrategy(request, _settings);

        // Assert
        result.Should().BeSameAs(_mockFallbackStrategy.Object);
    }

    [Fact]
    public void GetStrategy_SelectsFirstMatchingStrategy()
    {
        // Arrange
        var firstStrategy = new Mock<IAgentStreamingStrategy>();
        firstStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(true);

        var secondStrategy = new Mock<IAgentStreamingStrategy>();
        secondStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(true);

        var strategies = new List<IAgentStreamingStrategy> { firstStrategy.Object, secondStrategy.Object };
        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = "test" };

        // Act
        var result = factory.GetStrategy(request, _settings);

        // Assert
        result.Should().BeSameAs(firstStrategy.Object);
    }

    [Fact]
    public void GetStrategy_PassesSettingsToCanHandle()
    {
        // Arrange
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(false);

        var strategies = new List<IAgentStreamingStrategy> { mockStrategy.Object };
        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = "test" };

        // Act
        factory.GetStrategy(request, _settings);

        // Assert
        mockStrategy.Verify(s => s.CanHandle(request, _settings), Times.Once);
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("claude")]
    [InlineData("gemini")]
    [InlineData("grok")]
    [InlineData("ollama")]
    public void GetStrategy_IteratesAllStrategiesUntilMatch(string provider)
    {
        // Arrange
        var nonMatchingStrategy = new Mock<IAgentStreamingStrategy>();
        nonMatchingStrategy.Setup(s => s.CanHandle(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(false);

        var matchingStrategy = new Mock<IAgentStreamingStrategy>();
        matchingStrategy.Setup(s => s.CanHandle(
            It.Is<AgentRequest>(r => r.Provider == provider),
            It.IsAny<AIProvidersSettings>()))
            .Returns(true);

        var strategies = new List<IAgentStreamingStrategy>
        {
            nonMatchingStrategy.Object,
            matchingStrategy.Object
        };

        var factory = new AgentStreamingStrategyFactory(
            strategies,
            _mockFallbackStrategy.Object,
            _mockLogger.Object);

        var request = new AgentRequest { Provider = provider };

        // Act
        var result = factory.GetStrategy(request, _settings);

        // Assert
        result.Should().BeSameAs(matchingStrategy.Object);
        nonMatchingStrategy.Verify(s => s.CanHandle(request, _settings), Times.Once);
    }
}
