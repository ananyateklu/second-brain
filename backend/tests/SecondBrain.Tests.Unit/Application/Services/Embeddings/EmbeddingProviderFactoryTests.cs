using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;

namespace SecondBrain.Tests.Unit.Application.Services.Embeddings;

public class EmbeddingProviderFactoryTests
{
    private readonly Mock<IOptions<EmbeddingProvidersSettings>> _mockSettings;

    public EmbeddingProviderFactoryTests()
    {
        _mockSettings = new Mock<IOptions<EmbeddingProvidersSettings>>();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_InitializesWithProviders()
    {
        // Arrange
        var providers = new List<IEmbeddingProvider>
        {
            CreateMockProvider("OpenAI", true).Object,
            CreateMockProvider("Gemini", true).Object
        };
        SetupSettings("OpenAI");

        // Act
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Assert
        sut.Should().NotBeNull();
    }

    #endregion

    #region GetProvider Tests

    [Fact]
    public void GetProvider_WhenProviderExistsAndEnabled_ReturnsProvider()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", true);
        var providers = new List<IEmbeddingProvider> { provider.Object };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetProvider("OpenAI");

        // Assert
        result.Should().BeSameAs(provider.Object);
    }

    [Theory]
    [InlineData("openai", "OpenAI")]
    [InlineData("OPENAI", "OpenAI")]
    [InlineData("OpenAI", "OpenAI")]
    public void GetProvider_IsCaseInsensitive(string requestedName, string actualName)
    {
        // Arrange
        var provider = CreateMockProvider(actualName, true);
        var providers = new List<IEmbeddingProvider> { provider.Object };
        SetupSettings(actualName);
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetProvider(requestedName);

        // Assert
        result.Should().BeSameAs(provider.Object);
    }

    [Fact]
    public void GetProvider_WhenProviderNotFound_ThrowsArgumentException()
    {
        // Arrange
        var providers = new List<IEmbeddingProvider>();
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var act = () => sut.GetProvider("NonExistent");

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Embedding provider 'NonExistent' not found");
    }

    [Fact]
    public void GetProvider_WhenProviderExistsButDisabled_ThrowsInvalidOperationException()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", false);
        var providers = new List<IEmbeddingProvider> { provider.Object };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var act = () => sut.GetProvider("OpenAI");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Embedding provider 'OpenAI' is not enabled");
    }

    #endregion

    #region GetDefaultProvider Tests

    [Fact]
    public void GetDefaultProvider_ReturnsProviderFromSettings()
    {
        // Arrange
        var defaultProvider = CreateMockProvider("OpenAI", true);
        var otherProvider = CreateMockProvider("Gemini", true);
        var providers = new List<IEmbeddingProvider>
        {
            defaultProvider.Object,
            otherProvider.Object
        };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetDefaultProvider();

        // Assert
        result.Should().BeSameAs(defaultProvider.Object);
    }

    [Fact]
    public void GetDefaultProvider_WhenDefaultNotFound_ThrowsArgumentException()
    {
        // Arrange
        var providers = new List<IEmbeddingProvider>();
        SetupSettings("NonExistent");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var act = () => sut.GetDefaultProvider();

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void GetDefaultProvider_WhenDefaultDisabled_ThrowsInvalidOperationException()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", false);
        var providers = new List<IEmbeddingProvider> { provider.Object };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var act = () => sut.GetDefaultProvider();

        // Assert
        act.Should().Throw<InvalidOperationException>();
    }

    #endregion

    #region GetAllProviders Tests

    [Fact]
    public void GetAllProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var enabledProvider = CreateMockProvider("OpenAI", true);
        var disabledProvider = CreateMockProvider("Gemini", false);
        var anotherEnabled = CreateMockProvider("Ollama", true);
        var providers = new List<IEmbeddingProvider>
        {
            enabledProvider.Object,
            disabledProvider.Object,
            anotherEnabled.Object
        };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(enabledProvider.Object);
        result.Should().Contain(anotherEnabled.Object);
        result.Should().NotContain(disabledProvider.Object);
    }

    [Fact]
    public void GetAllProviders_WhenNoProvidersEnabled_ReturnsEmpty()
    {
        // Arrange
        var disabledProvider = CreateMockProvider("OpenAI", false);
        var providers = new List<IEmbeddingProvider> { disabledProvider.Object };
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetAllProviders().ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetAllProviders_WhenNoProviders_ReturnsEmpty()
    {
        // Arrange
        var providers = new List<IEmbeddingProvider>();
        SetupSettings("OpenAI");
        var sut = new EmbeddingProviderFactory(providers, _mockSettings.Object);

        // Act
        var result = sut.GetAllProviders().ToList();

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static Mock<IEmbeddingProvider> CreateMockProvider(string name, bool isEnabled)
    {
        var mock = new Mock<IEmbeddingProvider>();
        mock.Setup(p => p.ProviderName).Returns(name);
        mock.Setup(p => p.IsEnabled).Returns(isEnabled);
        mock.Setup(p => p.ModelName).Returns($"{name}-model");
        mock.Setup(p => p.Dimensions).Returns(1536);
        return mock;
    }

    private void SetupSettings(string defaultProvider)
    {
        var settings = new EmbeddingProvidersSettings
        {
            DefaultProvider = defaultProvider
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

