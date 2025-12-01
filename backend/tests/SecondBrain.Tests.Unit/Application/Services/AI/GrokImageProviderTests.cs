using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class GrokImageProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<GrokImageProvider>> _mockLogger;

    public GrokImageProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockLogger = new Mock<ILogger<GrokImageProvider>>();
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
    public void ProviderName_ReturnsGrok()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Grok");
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
        models.Should().Contain("grok-2-image");
        models.Should().Contain("grok-2-image-1212");
        models.Should().HaveCount(2);
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
        sizes.Should().Contain("1024x768");
        sizes.Should().Contain("768x1024");
        sizes.Should().HaveCount(3);
    }

    [Fact]
    public void GetSupportedSizes_WithDifferentModel_ReturnsSameSizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes1 = provider.GetSupportedSizes("grok-2-image").ToList();
        var sizes2 = provider.GetSupportedSizes("grok-2-image-1212").ToList();

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
        result.Provider.Should().Be("Grok");
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

    private GrokImageProvider CreateProvider()
    {
        return new GrokImageProvider(
            _mockSettings.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(bool enabled = false, string? apiKey = "")
    {
        var settings = new AIProvidersSettings
        {
            XAI = new XAISettings
            {
                Enabled = enabled,
                ApiKey = apiKey ?? string.Empty,
                BaseUrl = "https://api.x.ai/v1",
                DefaultModel = "grok-2-1212",
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

