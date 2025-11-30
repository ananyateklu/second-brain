using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.Embeddings;

public class OllamaEmbeddingProviderTests
{
    private readonly Mock<IOptions<EmbeddingProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<OllamaEmbeddingProvider>> _mockLogger;

    public OllamaEmbeddingProviderTests()
    {
        _mockSettings = new Mock<IOptions<EmbeddingProvidersSettings>>();
        _mockLogger = new Mock<ILogger<OllamaEmbeddingProvider>>();
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WhenDisabled_DoesNotCreateClient()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WhenEnabled_CreatesClient()
    {
        // Arrange
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void ProviderName_ReturnsOllama()
    {
        // Arrange
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Ollama");
    }

    [Fact]
    public void ModelName_ReturnsConfiguredModel()
    {
        // Arrange
        SetupSettings(enabled: false, model: "nomic-embed-text");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ModelName.Should().Be("nomic-embed-text");
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
        SetupSettings(enabled: false);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenEnabledInSettings_ReturnsTrue()
    {
        // Arrange
        SetupSettings(enabled: true);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
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
        result.Provider.Should().Be("Ollama");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenEnabled_ReturnsNotImplementedError()
    {
        // Arrange
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");
        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("Test text");

        // Assert
        // Current implementation returns an error as Ollama embedding is not fully implemented
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("configuration");
        result.Provider.Should().Be("Ollama");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenTextEmpty_ReturnsErrorIfEnabled()
    {
        // Arrange
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");
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
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");
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
        result.Provider.Should().Be("Ollama");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenTextsEmpty_ReturnsError()
    {
        // Arrange
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");
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
        SetupSettings(enabled: true, baseUrl: "http://localhost:11434");
        var provider = CreateProvider();
        var texts = new List<string> { "Text 1", "Text 2" };

        // Act
        var result = await provider.GenerateEmbeddingsAsync(texts);

        // Assert
        // Current implementation returns an error as Ollama embedding is not fully implemented
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
    public async Task IsAvailableAsync_WhenEnabledButNoConnection_ReturnsFalse()
    {
        // Arrange - Use an invalid URL that will fail to connect
        SetupSettings(enabled: true, baseUrl: "http://nonexistent-host:11434");
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        // Will return false because it can't connect to the Ollama server
        result.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private OllamaEmbeddingProvider CreateProvider()
    {
        return new OllamaEmbeddingProvider(
            _mockSettings.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(
        bool enabled = false,
        string baseUrl = "http://localhost:11434",
        string model = "nomic-embed-text",
        int dimensions = 768)
    {
        var settings = new EmbeddingProvidersSettings
        {
            DefaultProvider = "Ollama",
            Ollama = new OllamaEmbeddingSettings
            {
                Enabled = enabled,
                BaseUrl = baseUrl,
                Model = model,
                Dimensions = dimensions
            }
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    #endregion
}

