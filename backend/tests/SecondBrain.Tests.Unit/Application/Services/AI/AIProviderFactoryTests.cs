using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class AIProviderFactoryTests
{
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly AIProviderFactory _sut;

    public AIProviderFactoryTests()
    {
        _mockServiceProvider = new Mock<IServiceProvider>();
        _sut = new AIProviderFactory(_mockServiceProvider.Object);
    }

    #region GetProvider Tests

    [Theory]
    [InlineData("openai")]
    [InlineData("OpenAI")]
    [InlineData("OPENAI")]
    public void GetProvider_WhenOpenAIRequested_ReturnsOpenAIProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Theory]
    [InlineData("gemini")]
    [InlineData("Gemini")]
    [InlineData("GEMINI")]
    public void GetProvider_WhenGeminiRequested_ReturnsGeminiProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Theory]
    [InlineData("claude")]
    [InlineData("Claude")]
    [InlineData("CLAUDE")]
    public void GetProvider_WhenClaudeRequested_ReturnsClaudeProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Theory]
    [InlineData("ollama")]
    [InlineData("Ollama")]
    [InlineData("OLLAMA")]
    public void GetProvider_WhenOllamaRequested_ReturnsOllamaProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Theory]
    [InlineData("grok")]
    [InlineData("Grok")]
    [InlineData("xai")]
    [InlineData("XAI")]
    public void GetProvider_WhenGrokOrXAIRequested_ReturnsGrokProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Fact]
    public void GetProvider_WhenUnknownProviderRequested_ThrowsArgumentException()
    {
        // Act
        var act = () => _sut.GetProvider("unknown-provider");

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Unknown AI provider: unknown-provider*");
    }

    [Fact]
    public void GetProvider_WhenProviderNotResolved_ThrowsInvalidOperationException()
    {
        // Arrange
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(null!);

        // Act
        var act = () => _sut.GetProvider("openai");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Failed to resolve provider: openai");
    }

    #endregion

    #region GetAllProviders Tests

    [Fact]
    public void GetAllProviders_ReturnsAllResolvedProviders()
    {
        // Arrange
        var openAIProvider = CreateMockProvider("OpenAI", true);
        var geminiProvider = CreateMockProvider("Gemini", true);
        var claudeProvider = CreateMockProvider("Claude", false);
        var ollamaProvider = CreateMockProvider("Ollama", true);
        var grokProvider = CreateMockProvider("Grok", false);

        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(openAIProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(geminiProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(claudeProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(ollamaProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(grokProvider.Object);

        // Act
        var result = _sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(5);
    }

    [Fact]
    public void GetAllProviders_SkipsNullProviders()
    {
        // Arrange
        var openAIProvider = CreateMockProvider("OpenAI", true);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(openAIProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().Should().BeSameAs(openAIProvider.Object);
    }

    [Fact]
    public void GetAllProviders_DoesNotReturnDuplicatesForAliases()
    {
        // Arrange - Grok and XAI are aliases for the same provider
        var grokProvider = CreateMockProvider("Grok", true);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(grokProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetAllProviders().ToList();

        // Assert
        // GrokProvider should only appear once even though it's registered under both "grok" and "xai"
        result.Should().HaveCount(1);
    }

    #endregion

    #region GetEnabledProviders Tests

    [Fact]
    public void GetEnabledProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var enabledProvider = CreateMockProvider("OpenAI", true);
        var disabledProvider = CreateMockProvider("Gemini", false);

        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(enabledProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(disabledProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetEnabledProviders().ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().Should().BeSameAs(enabledProvider.Object);
    }

    [Fact]
    public void GetEnabledProviders_WhenNoProvidersEnabled_ReturnsEmpty()
    {
        // Arrange
        var disabledProvider = CreateMockProvider("OpenAI", false);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(disabledProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GeminiProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(ClaudeProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GrokProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetEnabledProviders().ToList();

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static Mock<IAIProvider> CreateMockProvider(string name, bool isEnabled)
    {
        var mock = new Mock<IAIProvider>();
        mock.Setup(p => p.ProviderName).Returns(name);
        mock.Setup(p => p.IsEnabled).Returns(isEnabled);
        return mock;
    }

    #endregion
}

