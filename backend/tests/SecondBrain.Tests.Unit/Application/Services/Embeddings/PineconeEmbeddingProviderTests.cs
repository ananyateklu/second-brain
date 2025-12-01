using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq.Protected;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Providers;

namespace SecondBrain.Tests.Unit.Application.Services.Embeddings;

public class PineconeEmbeddingProviderTests
{
    private readonly Mock<IOptions<PineconeSettings>> _mockSettings;
    private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
    private readonly Mock<ILogger<PineconeEmbeddingProvider>> _mockLogger;

    public PineconeEmbeddingProviderTests()
    {
        _mockSettings = new Mock<IOptions<PineconeSettings>>();
        _mockHttpClientFactory = new Mock<IHttpClientFactory>();
        _mockLogger = new Mock<ILogger<PineconeEmbeddingProvider>>();
    }

    #region Constructor and Properties Tests

    [Fact]
    public void Constructor_WithValidSettings_InitializesCorrectly()
    {
        // Arrange
        SetupSettings(apiKey: "test-key");
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Should().NotBeNull();
    }

    [Fact]
    public void ProviderName_ReturnsPinecone()
    {
        // Arrange
        SetupSettings();
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ProviderName.Should().Be("Pinecone");
    }

    [Fact]
    public void ModelName_ReturnsConfiguredModel()
    {
        // Arrange
        SetupSettings(model: "text-embedding-3-small");
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ModelName.Should().Be("text-embedding-3-small");
    }

    [Fact]
    public void ModelName_ReturnsCustomModel()
    {
        // Arrange
        SetupSettings(model: "custom-embedding-model");
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.ModelName.Should().Be("custom-embedding-model");
    }

    [Fact]
    public void Dimensions_ReturnsConfiguredDimensions()
    {
        // Arrange
        SetupSettings(dimensions: 1536);
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Dimensions.Should().Be(1536);
    }

    [Fact]
    public void Dimensions_ReturnsCustomDimensions()
    {
        // Arrange
        SetupSettings(dimensions: 768);
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.Dimensions.Should().Be(768);
    }

    [Fact]
    public void IsEnabled_WhenApiKeyProvided_ReturnsTrue()
    {
        // Arrange
        SetupSettings(apiKey: "test-api-key");
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void IsEnabled_WhenApiKeyEmpty_ReturnsFalse()
    {
        // Arrange
        SetupSettings(apiKey: "");
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void IsEnabled_WhenApiKeyNull_ReturnsFalse()
    {
        // Arrange
        SetupSettings(apiKey: null);
        SetupHttpClient();

        // Act
        var provider = CreateProvider();

        // Assert
        provider.IsEnabled.Should().BeFalse();
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenNotEnabled_ReturnsFalse()
    {
        // Arrange
        SetupSettings(apiKey: "");
        SetupHttpClient();
        var provider = CreateProvider();

        // Act
        var result = await provider.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GenerateEmbeddingAsync Tests

    [Fact]
    public async Task GenerateEmbeddingAsync_WhenExceptionOccurs_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(apiKey: "test-key");
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection failed"));

        var httpClient = new HttpClient(mockHandler.Object);
        _mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingAsync("test text");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Connection failed");
        result.Provider.Should().Be("Pinecone");
    }

    #endregion

    #region GenerateEmbeddingsAsync Tests

    [Fact]
    public async Task GenerateEmbeddingsAsync_WhenExceptionOccurs_ReturnsErrorResponse()
    {
        // Arrange
        SetupSettings(apiKey: "test-key");
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection failed"));

        var httpClient = new HttpClient(mockHandler.Object);
        _mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);

        var provider = CreateProvider();

        // Act
        var result = await provider.GenerateEmbeddingsAsync(new[] { "text1", "text2" });

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Connection failed");
        result.Provider.Should().Be("Pinecone");
    }

    #endregion

    #region Helper Methods

    private PineconeEmbeddingProvider CreateProvider()
    {
        return new PineconeEmbeddingProvider(
            _mockSettings.Object,
            _mockHttpClientFactory.Object,
            _mockLogger.Object
        );
    }

    private void SetupSettings(
        string? apiKey = "test-key",
        string model = "text-embedding-3-small",
        int dimensions = 1536)
    {
        var settings = new PineconeSettings
        {
            ApiKey = apiKey ?? string.Empty,
            Model = model,
            Dimensions = dimensions,
            IndexName = "test-index",
            Environment = "test-env"
        };
        _mockSettings.Setup(s => s.Value).Returns(settings);
    }

    private void SetupHttpClient()
    {
        var httpClient = new HttpClient();
        _mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);
    }

    #endregion
}

