using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI.Embeddings;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Interfaces;
using SecondBrain.Application.Services.Embeddings.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.Embeddings;

public class OpenAIEmbeddingProviderTests
{
    private readonly Mock<IOptions<EmbeddingProvidersSettings>> _mockSettings;
    private readonly Mock<IOpenAIEmbeddingClientFactory> _mockClientFactory;
    private readonly Mock<ILogger<OpenAIEmbeddingProvider>> _mockLogger;

    public OpenAIEmbeddingProviderTests()
    {
        _mockSettings = new Mock<IOptions<EmbeddingProvidersSettings>>();
        _mockClientFactory = new Mock<IOpenAIEmbeddingClientFactory>();
        _mockLogger = new Mock<ILogger<OpenAIEmbeddingProvider>>();
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
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenEnabledWithNoApiKey_DoesNotCreateClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
        _mockClientFactory.Verify(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Constructor_WhenEnabledWithApiKey_CreatesClient()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "test-api-key", model: "text-embedding-3-small");
        _mockClientFactory.Setup(f => f.CreateClient("test-api-key", "text-embedding-3-small"))
            .Returns((EmbeddingClient?)null);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
        _mockClientFactory.Verify(f => f.CreateClient("test-api-key", "text-embedding-3-small"), Times.Once);
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
    public void ModelName_ReturnsConfiguredModel()
    {
        // Arrange
        SetupSettings(enabled: false, model: "text-embedding-ada-002");

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ModelName.Should().Be("text-embedding-ada-002");
    }

    [Fact]
    public void Dimensions_ReturnsConfiguredDimensions()
    {
        // Arrange
        SetupSettings(enabled: false, dimensions: 1536);

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Dimensions.Should().Be(1536);
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
        result.Provider.Should().Be("OpenAI");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenClientNull_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("Test text");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenTextEmpty_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("");

        // Assert
        result.Success.Should().BeFalse();
        // The empty check happens after the client check
    }

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenTextWhitespace_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("   ");

        // Assert
        result.Success.Should().BeFalse();
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
        result.Provider.Should().Be("OpenAI");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenClientNull_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();
        var texts = new List<string> { "Text 1", "Text 2" };

        // Act
        var result = await provider.GenerateEmbeddingsAsync(texts);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not enabled");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenTextsEmpty_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingsAsync(Array.Empty<string>());

        // Assert
        result.Success.Should().BeFalse();
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
    public async Task IsAvailableAsync_WhenClientNull_ReturnsFalse()
    {
        // Arrange
        SetupSettings(enabled: true, apiKey: "key");
        _mockClientFactory.Setup(f => f.CreateClient(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((EmbeddingClient?)null);

        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private OpenAIEmbeddingProvider CreateProvider()
    {
        return new OpenAIEmbeddingProvider(
            _mockSettings.Object,
            _mockClientFactory.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(
        bool enabled = false,
        string apiKey = "",
        string model = "text-embedding-3-small",
        int dimensions = 1536)
    {
        var settings = new EmbeddingProvidersSettings
        {
            DefaultProvider = "OpenAI",
            OpenAI = new OpenAIEmbeddingSettings
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

