using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class ImageGenerationProviderFactoryTests
{
    #region Constructor Tests

    [Fact]
    public void Constructor_WithProviders_InitializesCorrectly()
    {
        // Arrange
        var providers = new List<IImageGenerationProvider>
        {
            CreateMockProvider("OpenAI", true).Object,
            CreateMockProvider("Gemini", true).Object
        };

        // Act
        var sut = new ImageGenerationProviderFactory(providers);

        // Assert
        sut.Should().NotBeNull();
        sut.GetAllProviders().Should().HaveCount(2);
    }

    [Fact]
    public void Constructor_WithEmptyProviders_InitializesWithNoProviders()
    {
        // Arrange
        var providers = new List<IImageGenerationProvider>();

        // Act
        var sut = new ImageGenerationProviderFactory(providers);

        // Assert
        sut.Should().NotBeNull();
        sut.GetAllProviders().Should().BeEmpty();
    }

    #endregion

    #region GetProvider Tests

    [Fact]
    public void GetProvider_WhenProviderExists_ReturnsProvider()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.GetProvider("OpenAI");

        // Assert
        result.Should().BeSameAs(provider.Object);
    }

    [Theory]
    [InlineData("openai", "OpenAI")]
    [InlineData("OPENAI", "OpenAI")]
    [InlineData("OpenAI", "OpenAI")]
    [InlineData("gemini", "Gemini")]
    [InlineData("GEMINI", "Gemini")]
    public void GetProvider_IsCaseInsensitive(string requestedName, string actualName)
    {
        // Arrange
        var provider = CreateMockProvider(actualName, true);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.GetProvider(requestedName);

        // Assert
        result.Should().BeSameAs(provider.Object);
    }

    [Fact]
    public void GetProvider_WhenProviderNotFound_ThrowsArgumentException()
    {
        // Arrange
        var sut = new ImageGenerationProviderFactory(Array.Empty<IImageGenerationProvider>());

        // Act
        var act = () => sut.GetProvider("NonExistent");

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("Image generation provider 'NonExistent' not found*")
            .WithParameterName("providerName");
    }

    [Fact]
    public void GetProvider_ThrowsWithAvailableProvidersInMessage()
    {
        // Arrange
        var provider1 = CreateMockProvider("OpenAI", true);
        var provider2 = CreateMockProvider("Gemini", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider1.Object, provider2.Object });

        // Act
        var act = () => sut.GetProvider("NonExistent");

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*Available providers: *");
    }

    #endregion

    #region GetAllProviders Tests

    [Fact]
    public void GetAllProviders_ReturnsAllProviders()
    {
        // Arrange
        var provider1 = CreateMockProvider("OpenAI", true);
        var provider2 = CreateMockProvider("Gemini", false);
        var provider3 = CreateMockProvider("Grok", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider1.Object, provider2.Object, provider3.Object });

        // Act
        var result = sut.GetAllProviders().ToList();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(provider1.Object);
        result.Should().Contain(provider2.Object);
        result.Should().Contain(provider3.Object);
    }

    [Fact]
    public void GetAllProviders_WhenNoProviders_ReturnsEmpty()
    {
        // Arrange
        var sut = new ImageGenerationProviderFactory(Array.Empty<IImageGenerationProvider>());

        // Act
        var result = sut.GetAllProviders();

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetEnabledProviders Tests

    [Fact]
    public void GetEnabledProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var enabledProvider1 = CreateMockProvider("OpenAI", true);
        var disabledProvider = CreateMockProvider("Gemini", false);
        var enabledProvider2 = CreateMockProvider("Grok", true);
        var sut = new ImageGenerationProviderFactory(new[]
        {
            enabledProvider1.Object,
            disabledProvider.Object,
            enabledProvider2.Object
        });

        // Act
        var result = sut.GetEnabledProviders().ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(enabledProvider1.Object);
        result.Should().Contain(enabledProvider2.Object);
        result.Should().NotContain(disabledProvider.Object);
    }

    [Fact]
    public void GetEnabledProviders_WhenNoProvidersEnabled_ReturnsEmpty()
    {
        // Arrange
        var disabledProvider1 = CreateMockProvider("OpenAI", false);
        var disabledProvider2 = CreateMockProvider("Gemini", false);
        var sut = new ImageGenerationProviderFactory(new[] { disabledProvider1.Object, disabledProvider2.Object });

        // Act
        var result = sut.GetEnabledProviders();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetEnabledProviders_WhenAllProvidersEnabled_ReturnsAll()
    {
        // Arrange
        var provider1 = CreateMockProvider("OpenAI", true);
        var provider2 = CreateMockProvider("Gemini", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider1.Object, provider2.Object });

        // Act
        var result = sut.GetEnabledProviders().ToList();

        // Assert
        result.Should().HaveCount(2);
    }

    #endregion

    #region HasProvider Tests

    [Fact]
    public void HasProvider_WhenProviderExists_ReturnsTrue()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.HasProvider("OpenAI");

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("openai")]
    [InlineData("OPENAI")]
    [InlineData("OpenAI")]
    public void HasProvider_IsCaseInsensitive(string providerName)
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.HasProvider(providerName);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void HasProvider_WhenProviderNotExists_ReturnsFalse()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", true);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.HasProvider("NonExistent");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void HasProvider_WithEmptyProviders_ReturnsFalse()
    {
        // Arrange
        var sut = new ImageGenerationProviderFactory(Array.Empty<IImageGenerationProvider>());

        // Act
        var result = sut.HasProvider("OpenAI");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void HasProvider_ReturnsTrueEvenIfDisabled()
    {
        // Arrange
        var provider = CreateMockProvider("OpenAI", false);
        var sut = new ImageGenerationProviderFactory(new[] { provider.Object });

        // Act
        var result = sut.HasProvider("OpenAI");

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region Helper Methods

    private static Mock<IImageGenerationProvider> CreateMockProvider(string name, bool isEnabled)
    {
        var mock = new Mock<IImageGenerationProvider>();
        mock.Setup(p => p.ProviderName).Returns(name);
        mock.Setup(p => p.IsEnabled).Returns(isEnabled);
        mock.Setup(p => p.GetSupportedModels()).Returns(new[] { "model-1", "model-2" });
        mock.Setup(p => p.GetSupportedSizes(It.IsAny<string>())).Returns(new[] { "1024x1024", "512x512" });
        return mock;
    }

    #endregion
}

