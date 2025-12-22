using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class GeminiImageProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<GeminiImageProvider>> _mockLogger;

    public GeminiImageProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<GeminiImageProvider>>();

        // Setup default HttpClient mock
        _mockHttpClientFactory
            .Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient());
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WithValidSettings_InitializesCorrectly()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test-api-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Should().NotBeNull();
    }

    [Fact]
    public void ProviderName_ReturnsGemini()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Gemini");
    }

    [Fact]
    public void IsEnabled_WhenEnabledWithApiKey_ReturnsTrue()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void IsEnabled_WhenDisabled_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: false, apiKey: "test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenEnabledWithEmptyApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenEnabledWithWhitespaceApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "   ");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenEnabledWithNullApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: null);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    #endregion

    #region GetSupportedModels Tests

    [Fact]
    public void GetSupportedModels_ReturnsExpectedModels()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var models = provider.GetSupportedModels().ToList();

        // Assert
        models.Should().NotBeEmpty();
        models.Should().Contain("gemini-3-pro-image-preview");
        models.Should().Contain("gemini-2.5-flash-image-preview");
        models.Should().Contain("gemini-2.5-flash-image");
        models.Should().Contain("gemini-2.0-flash-exp-image-generation");
    }

    #endregion

    #region GetSupportedSizes Tests

    [Fact]
    public void GetSupportedSizes_ReturnsExpectedSizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes = provider.GetSupportedSizes("any-model").ToList();

        // Assert
        sizes.Should().NotBeEmpty();
        sizes.Should().Contain("1024x1024");
        sizes.Should().Contain("1536x1024");
        sizes.Should().Contain("1024x1536");
        sizes.Should().Contain("1792x1024");
        sizes.Should().Contain("1024x1792");
    }

    [Fact]
    public void GetSupportedSizes_WithDifferentModel_ReturnsSameSizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes1 = provider.GetSupportedSizes("gemini-3-pro-image-preview").ToList();
        var sizes2 = provider.GetSupportedSizes("imagen-3.0-generate-001").ToList();

        // Assert
        sizes1.Should().BeEquivalentTo(sizes2);
    }

    #endregion

    #region GenerateImageAsync Tests

    [Fact]
    public async Task GenerateImageAsync_WhenNotEnabled_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var request = new ImageGenerationRequest
        {
            Prompt = "A cat",
            Size = "1024x1024"
        };

        // Act
        var result = await provider.GenerateImageAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateImageAsync_WhenApiKeyEmpty_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var request = new ImageGenerationRequest
        {
            Prompt = "A cat",
            Size = "1024x1024"
        };

        // Act
        var result = await provider.GenerateImageAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenNotEnabled_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsAvailableAsync_WhenEnabledButNoApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private GeminiImageProvider CreateProvider()
    {
        return new GeminiImageProvider(
            _mockSettings.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(bool enabled = false, string? apiKey = "")
    {
        var settings = new AIProvidersSettings
        {
            Gemini = new GeminiSettings
            {
                Enabled = enabled,
                ApiKey = apiKey ?? string.Empty,
                DefaultModel = "gemini-1.5-pro",
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

