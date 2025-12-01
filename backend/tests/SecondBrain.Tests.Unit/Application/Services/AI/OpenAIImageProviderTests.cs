using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class OpenAIImageProviderTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<OpenAIImageProvider>> _mockLogger;

    public OpenAIImageProviderTests()
    {
        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockLogger = new Mock<ILogger<OpenAIImageProvider>>();
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
    public void ProviderName_ReturnsOpenAI()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("OpenAI");
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
        models.Should().Contain("dall-e-3");
        models.Should().Contain("dall-e-2");
        models.Should().HaveCount(2);
    }

    #endregion

    #region GetSupportedSizes Tests

    [Fact]
    public void GetSupportedSizes_ForDalle3_ReturnsCorrectSizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes = provider.GetSupportedSizes("dall-e-3").ToList();

        // Assert
        sizes.Should().NotBeEmpty();
        sizes.Should().Contain("1024x1024");
        sizes.Should().Contain("1792x1024");
        sizes.Should().Contain("1024x1792");
        sizes.Should().HaveCount(3);
    }

    [Fact]
    public void GetSupportedSizes_ForDalle2_ReturnsCorrectSizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes = provider.GetSupportedSizes("dall-e-2").ToList();

        // Assert
        sizes.Should().NotBeEmpty();
        sizes.Should().Contain("256x256");
        sizes.Should().Contain("512x512");
        sizes.Should().Contain("1024x1024");
        sizes.Should().HaveCount(3);
    }

    [Fact]
    public void GetSupportedSizes_ForUnknownModel_ReturnsDalle3Sizes()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var sizes = provider.GetSupportedSizes("unknown-model").ToList();

        // Assert - Should default to dall-e-3 sizes
        sizes.Should().Contain("1024x1024");
        sizes.Should().Contain("1792x1024");
        sizes.Should().Contain("1024x1792");
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
        result.Provider.Should().Be("OpenAI");
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

    private OpenAIImageProvider CreateProvider()
    {
        return new OpenAIImageProvider(
            _mockSettings.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(bool enabled = false, string? apiKey = "")
    {
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings
            {
                Enabled = enabled,
                ApiKey = apiKey ?? string.Empty,
                BaseUrl = "https://api.openai.com/v1",
                DefaultModel = "gpt-4-turbo",
                MaxTokens = 4096,
                Temperature = 0.7f
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

