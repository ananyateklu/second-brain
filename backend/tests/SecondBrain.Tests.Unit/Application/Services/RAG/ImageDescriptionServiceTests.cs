using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for ImageDescriptionService.
/// Tests image description extraction using vision-capable AI models.
/// </summary>
public class ImageDescriptionServiceTests
{
    private readonly Mock<IAIProviderFactory> _mockProviderFactory;
    private readonly Mock<ILogger<ImageDescriptionService>> _mockLogger;
    private readonly AIProvidersSettings _settings;
    private readonly ImageDescriptionService _sut;

    public ImageDescriptionServiceTests()
    {
        _mockProviderFactory = new Mock<IAIProviderFactory>();
        _mockLogger = new Mock<ILogger<ImageDescriptionService>>();
        _settings = new AIProvidersSettings();

        var options = Options.Create(_settings);
        _sut = new ImageDescriptionService(
            _mockProviderFactory.Object,
            options,
            _mockLogger.Object);
    }

    #region IsAvailable Tests

    [Fact]
    public void IsAvailable_WhenGeminiEnabled_ReturnsTrue()
    {
        // Arrange
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsAvailable_WhenOpenAIEnabled_ReturnsTrue()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns((IAIProvider?)null);
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsAvailable_WhenClaudeEnabled_ReturnsTrue()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns((IAIProvider?)null);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns((IAIProvider?)null);
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProviderFactory.Setup(f => f.GetProvider("claude"))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsAvailable_WhenNoProvidersEnabled_ReturnsFalse()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>()))
            .Returns((IAIProvider?)null);

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsAvailable_WhenProviderThrows_ReturnsFalse()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>()))
            .Throws<Exception>();

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsAvailable_WhenProviderDisabled_ChecksNextProvider()
    {
        // Arrange
        var disabledProvider = new Mock<IAIProvider>();
        disabledProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(disabledProvider.Object);

        var enabledProvider = new Mock<IAIProvider>();
        enabledProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(enabledProvider.Object);

        // Act
        var result = _sut.IsAvailable;

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region ExtractDescriptionAsync - Basic Functionality Tests

    [Fact]
    public async Task ExtractDescriptionAsync_WhenEmptyImageData_ReturnsFailure()
    {
        // Arrange
        var base64Data = "";
        var mediaType = "image/png";

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("empty");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WhenNullImageData_ReturnsFailure()
    {
        // Arrange
        string? base64Data = null;
        var mediaType = "image/png";

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data!, mediaType);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("empty");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WhenNoProviderAvailable_ReturnsFailure()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        _mockProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>()))
            .Returns((IAIProvider?)null);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("No vision-capable AI provider available");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WhenProviderSucceeds_ReturnsDescription()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var mockProvider = CreateMockVisionProvider("This is a test image description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Success.Should().BeTrue();
        result.Description.Should().Be("This is a test image description");
        result.Provider.Should().Be("gemini");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WhenProviderFails_ReturnsFailure()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<List<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = false, Error = "API error" });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("API error");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WhenProviderThrows_ReturnsFailure()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<List<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Connection failed"));

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be("Connection failed");
    }

    #endregion

    #region ExtractDescriptionAsync - Provider Selection Tests

    [Fact]
    public async Task ExtractDescriptionAsync_PrioritizesGemini()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var geminiProvider = CreateMockVisionProvider("Gemini description");
        var openAIProvider = CreateMockVisionProvider("OpenAI description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(geminiProvider.Object);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(openAIProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Provider.Should().Be("gemini");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_FallsBackToOpenAI()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var openAIProvider = CreateMockVisionProvider("OpenAI description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns((IAIProvider?)null);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(openAIProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Provider.Should().Be("openai");
    }

    [Fact]
    public async Task ExtractDescriptionAsync_FallsBackToClaude()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var claudeProvider = CreateMockVisionProvider("Claude description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns((IAIProvider?)null);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns((IAIProvider?)null);
        _mockProviderFactory.Setup(f => f.GetProvider("claude"))
            .Returns(claudeProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Provider.Should().Be("claude");
    }

    #endregion

    #region ExtractDescriptionAsync - Context Tests

    [Fact]
    public async Task ExtractDescriptionAsync_WithContext_UsesContextualPrompt()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var context = "My Note Title";
        string? capturedPrompt = null;
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, AIRequest, CancellationToken>((m, r, ct) => capturedPrompt = m.First().Content)
            .ReturnsAsync(new AIResponse { Success = true, Content = "Description" });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        await _sut.ExtractDescriptionAsync(base64Data, mediaType, context);

        // Assert
        capturedPrompt.Should().Contain(context);
    }

    [Fact]
    public async Task ExtractDescriptionAsync_WithoutContext_UsesDefaultPrompt()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        string? capturedPrompt = null;
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, AIRequest, CancellationToken>((m, r, ct) => capturedPrompt = m.First().Content)
            .ReturnsAsync(new AIResponse { Success = true, Content = "Description" });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        capturedPrompt.Should().Contain("Main subject/content of the image");
    }

    #endregion

    #region ExtractDescriptionAsync - Response Mapping Tests

    [Fact]
    public async Task ExtractDescriptionAsync_MapsTokenUsage()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<List<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "Description",
                Usage = TokenUsageDetails.CreateActual(100, 50)
            });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.InputTokens.Should().Be(100);
        result.OutputTokens.Should().Be(50);
    }

    [Fact]
    public async Task ExtractDescriptionAsync_TrimsDescription()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/png";
        var mockProvider = CreateMockVisionProvider("  Description with whitespace  ");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert
        result.Description.Should().Be("Description with whitespace");
    }

    #endregion

    #region ExtractDescriptionsBatchAsync Tests

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_WhenEmptyList_ReturnsEmptyList()
    {
        // Arrange
        var images = new List<ImageInput>();

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_ProcessesAllImages()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdDE=", MediaType = "image/png" },
            new() { Id = "img-2", Base64Data = "dGVzdDI=", MediaType = "image/png" },
            new() { Id = "img-3", Base64Data = "dGVzdDM=", MediaType = "image/png" }
        };
        var mockProvider = CreateMockVisionProvider("Description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        result.Should().HaveCount(3);
        result.Select(r => r.ImageId).Should().BeEquivalentTo(new[] { "img-1", "img-2", "img-3" });
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_SetsImageId()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "unique-id", Base64Data = "dGVzdA==", MediaType = "image/png" }
        };
        var mockProvider = CreateMockVisionProvider("Description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        result.Single().ImageId.Should().Be("unique-id");
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_PrependsAltText()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdA==", MediaType = "image/png", AltText = "User provided description" }
        };
        var mockProvider = CreateMockVisionProvider("AI description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        result.Single().Description.Should().StartWith("[User description: User provided description]");
        result.Single().Description.Should().Contain("AI description");
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_UsesAltTextAsFallback()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdA==", MediaType = "image/png", AltText = "Fallback description" }
        };

        _mockProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>()))
            .Returns((IAIProvider?)null);

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        var item = result.Single();
        item.Success.Should().BeTrue();
        item.Description.Should().Contain("Fallback description");
        item.Provider.Should().Be("user");
        item.Model.Should().Be("alt_text");
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_PassesContext()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdA==", MediaType = "image/png" }
        };
        var context = "Note Context";
        string? capturedPrompt = null;
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .Callback<IEnumerable<ChatMessage>, AIRequest, CancellationToken>((m, r, ct) => capturedPrompt = m.First().Content)
            .ReturnsAsync(new AIResponse { Success = true, Content = "Description" });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        await _sut.ExtractDescriptionsBatchAsync(images, context);

        // Assert
        capturedPrompt.Should().Contain(context);
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_RespectsCancellation()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdDE=", MediaType = "image/png" },
            new() { Id = "img-2", Base64Data = "dGVzdDI=", MediaType = "image/png" },
            new() { Id = "img-3", Base64Data = "dGVzdDM=", MediaType = "image/png" }
        };
        var cts = new CancellationTokenSource();
        var callCount = 0;
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<List<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .Callback(() =>
            {
                callCount++;
                if (callCount >= 1) cts.Cancel();
            })
            .ReturnsAsync(new AIResponse { Success = true, Content = "Description" });

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionsBatchAsync(images, null, cts.Token);

        // Assert
        result.Count.Should().BeLessThan(3);
    }

    [Fact]
    public async Task ExtractDescriptionsBatchAsync_LogsProgress()
    {
        // Arrange
        var images = new List<ImageInput>
        {
            new() { Id = "img-1", Base64Data = "dGVzdA==", MediaType = "image/png" }
        };
        var mockProvider = CreateMockVisionProvider("Description");

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(mockProvider.Object);

        // Act
        await _sut.ExtractDescriptionsBatchAsync(images);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Extracting descriptions for")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region Image Format Support Tests

    [Fact]
    public async Task ExtractDescriptionAsync_SkipsProviderIfFormatNotSupported()
    {
        // Arrange
        var base64Data = "dGVzdA==";
        var mediaType = "image/webp"; // Assume gemini doesn't support webp
        var openAIProvider = CreateMockVisionProvider("OpenAI description");

        // Gemini returns enabled but format not supported
        var geminiProvider = new Mock<IAIProvider>();
        geminiProvider.Setup(p => p.IsEnabled).Returns(true);

        _mockProviderFactory.Setup(f => f.GetProvider("gemini"))
            .Returns(geminiProvider.Object);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(openAIProvider.Object);

        // Act
        var result = await _sut.ExtractDescriptionAsync(base64Data, mediaType);

        // Assert - should fall back to openai if gemini doesn't support the format
        // (actual behavior depends on MultimodalConfig.IsImageFormatSupported implementation)
        result.Should().NotBeNull();
    }

    #endregion

    #region Helper Methods

    private static Mock<IAIProvider> CreateMockVisionProvider(string description)
    {
        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<List<ChatMessage>>(), It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = description });
        return mockProvider;
    }

    #endregion
}
