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
    [InlineData("google")]
    [InlineData("Google")]
    [InlineData("GOOGLE")]
    public void GetProvider_WhenGoogleRequested_ReturnsGoogleProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetProvider(providerName);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(mockProvider.Object);
    }

    [Theory]
    [InlineData("anthropic")]
    [InlineData("Anthropic")]
    [InlineData("ANTHROPIC")]
    public void GetProvider_WhenAnthropicRequested_ReturnsAnthropicProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
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
    [InlineData("xai")]
    [InlineData("XAI")]
    [InlineData("Xai")]
    public void GetProvider_WhenXAIRequested_ReturnsXaiProvider(string providerName)
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
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
        var geminiProvider = CreateMockProvider("Google", true);
        var claudeProvider = CreateMockProvider("Anthropic", false);
        var ollamaProvider = CreateMockProvider("Ollama", true);
        var xaiProvider = CreateMockProvider("Xai", false);

        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(openAIProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(geminiProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
            .Returns(claudeProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(ollamaProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
            .Returns(xaiProvider.Object);

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
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().Should().BeSameAs(openAIProvider.Object);
    }

    [Fact]
    public void GetAllProviders_IncludesXaiProvider()
    {
        // Arrange
        var xaiProvider = CreateMockProvider("Xai", true);
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
            .Returns(xaiProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);

        // Act
        var result = _sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().ProviderName.Should().Be("Xai");
    }

    #endregion

    #region GetEnabledProviders Tests

    [Fact]
    public void GetEnabledProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var enabledProvider = CreateMockProvider("OpenAI", true);
        var disabledProvider = CreateMockProvider("Google", false);

        _mockServiceProvider.Setup(s => s.GetService(typeof(OpenAIProvider)))
            .Returns(enabledProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(disabledProvider.Object);
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
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
        _mockServiceProvider.Setup(s => s.GetService(typeof(GoogleProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(AnthropicProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(OllamaProvider)))
            .Returns(null!);
        _mockServiceProvider.Setup(s => s.GetService(typeof(XaiProvider)))
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

