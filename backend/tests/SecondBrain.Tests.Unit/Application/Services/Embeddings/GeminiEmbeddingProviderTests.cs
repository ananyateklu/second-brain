using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.Embeddings;

public class GeminiEmbeddingProviderTests
{
    private readonly Mock<IOptions<EmbeddingProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<GeminiEmbeddingProvider>> _mockLogger;

    public GeminiEmbeddingProviderTests()
    {
        _mockSettings = new Mock<IOptions<EmbeddingProvidersSettings>>();
        _mockLogger = new Mock<ILogger<GeminiEmbeddingProvider>>();
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WhenDisabled_DoesNotCreateClient()
    {
        // Arrange
        SetupSettings(enabled: false, apiKey: "test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WhenEnabledWithNoApiKey_IsNotEnabled()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_IsEnabled()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
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
    public void ModelName_ReturnsConfiguredModel()
    {
        // Arrange
        SetupSettings(enabled: false, model: "text-embedding-004");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ModelName.Should().Be("text-embedding-004");
    }

    [Fact]
    public void Dimensions_ReturnsConfiguredDimensions()
    {
        // Arrange
        SetupSettings(enabled: false, dimensions: 768);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Dimensions.Should().Be(768);
    }

    [Fact]
    public void IsEnabled_WhenDisabledInSettings_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: false, apiKey: "test-key");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenEnabledButNoApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    #endregion

    #region GenerateEmbeddingAsync Tests

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenNotEnabled_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("Test text");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenNoApiKey_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("Test text");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenEnabled_ReturnsNotImplementedError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("Test text");

        // Assert
        // Current implementation returns an error as Gemini embedding is not fully implemented
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("configuration");
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenTextEmpty_ReturnsErrorIfEnabled()
    {
        // Arrange - Provider is enabled but text is empty
        // When not enabled, it returns the "not enabled" error before checking text
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("empty");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenTextWhitespace_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("   ");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("empty");
    }

    #endregion

    #region GenerateEmbeddingsAsync Tests

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenNotEnabled_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: false);
        var provider = CreateProvider();
        var texts = new List<string> { "Text 1", "Text 2" };

        // Act
        var result = await provider.GenerateEmbeddingsAsync(texts);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
        result.Provider.Should().Be("Gemini");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenNoApiKey_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();
        var texts = new List<string> { "Text 1", "Text 2" };

        // Act
        var result = await provider.GenerateEmbeddingsAsync(texts);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenTextsEmpty_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingsAsync(Array.Empty<string>());

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("empty");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenEnabled_ReturnsNotImplementedError()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();
        var texts = new List<string> { "Text 1", "Text 2" };

        // Act
        var result = await provider.GenerateEmbeddingsAsync(texts);

        // Assert
        // Current implementation returns an error as Gemini embedding is not fully implemented
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("configuration");
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
    public async Task IsAvailableAsync_WhenNoApiKey_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsAvailableAsync_WhenEnabled_ReturnsFalseAsNotImplemented()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test_gemini_key_not_a_real_key_12345678");
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        // Returns false because GenerateEmbeddingAsync returns Success = false
        result.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private GeminiEmbeddingProvider CreateProvider()
    {
        return new GeminiEmbeddingProvider(
            _mockSettings.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(
        bool enabled = false,
        string apiKey = "",
        string model = "text-embedding-004",
        int dimensions = 768)
    {
        var settings = new EmbeddingProvidersSettings
        {
            DefaultProvider = "Gemini",
            Gemini = new GeminiEmbeddingSettings
            {
                Enabled = enabled,
                ApiKey = apiKey,
                Model = model,
                Dimensions = dimensions
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

