using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Application.Services;

public class RagServiceTests
{
    private readonly Mock<IEmbeddingProviderFactory> _mockEmbeddingProviderFactory;
    private readonly Mock<IVectorStore> _mockVectorStore;
    private readonly Mock<IEmbeddingProvider> _mockEmbeddingProvider;
    private readonly Mock<ILogger<RagService>> _mockLogger;
    private readonly RagSettings _ragSettings;
    private readonly RagService _sut;

    public RagServiceTests()
    {
        _mockEmbeddingProviderFactory = new Mock<IEmbeddingProviderFactory>();
        _mockVectorStore = new Mock<IVectorStore>();
        _mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        _mockLogger = new Mock<ILogger<RagService>>();

        _ragSettings = new RagSettings
        {
            TopK = 5,
            SimilarityThreshold = 0.7f,
            MaxContextLength = 4000
        };

        // Setup default embedding provider
        _mockEmbeddingProvider.Setup(p => p.ProviderName).Returns("OpenAI");
        _mockEmbeddingProvider.Setup(p => p.ModelName).Returns("text-embedding-3-small");
        _mockEmbeddingProviderFactory.Setup(f => f.GetDefaultProvider())
            .Returns(_mockEmbeddingProvider.Object);

        var options = Options.Create(_ragSettings);
        _sut = new RagService(
            _mockEmbeddingProviderFactory.Object,
            _mockVectorStore.Object,
            options,
            _mockLogger.Object
        );
    }

    #region RetrieveContextAsync Tests

    [Fact]
    public async Task RetrieveContextAsync_WhenEmbeddingSucceeds_ReturnsContextWithNotes()
    {
        // Arrange
        var userId = "user-123";
        var query = "How do I implement authentication?";
        var embedding = new List<double> { 0.1, 0.2, 0.3 };
        var searchResults = new List<VectorSearchResult>
        {
            CreateSearchResult("note-1", "Auth Implementation", 0.95f),
            CreateSearchResult("note-2", "Security Best Practices", 0.85f)
        };

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                TokensUsed = 10
            });

        _mockVectorStore.Setup(v => v.SearchAsync(
                embedding, userId, _ragSettings.TopK, _ragSettings.SimilarityThreshold, It.IsAny<CancellationToken>()))
            .ReturnsAsync(searchResults);

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.Should().NotBeNull();
        result.RetrievedNotes.Should().HaveCount(2);
        result.TotalTokensUsed.Should().Be(10);
        result.FormattedContext.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RetrieveContextAsync_WhenEmbeddingFails_ReturnsEmptyContext()
    {
        // Arrange
        var userId = "user-123";
        var query = "Test query";

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse
            {
                Success = false,
                Error = "API Error",
                Embedding = new List<double>()
            });

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.Should().NotBeNull();
        result.RetrievedNotes.Should().BeEmpty();
        result.FormattedContext.Should().BeEmpty();
        _mockVectorStore.Verify(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RetrieveContextAsync_WhenNoNotesFound_ReturnsEmptyFormattedContext()
    {
        // Arrange
        var userId = "user-123";
        var query = "Unrelated query with no matches";
        var embedding = new List<double> { 0.1, 0.2, 0.3 };

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                TokensUsed = 5
            });

        _mockVectorStore.Setup(v => v.SearchAsync(
                embedding, userId, It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.Should().NotBeNull();
        result.RetrievedNotes.Should().BeEmpty();
        result.FormattedContext.Should().BeEmpty();
    }

    [Fact]
    public async Task RetrieveContextAsync_UsesCustomTopKAndThreshold()
    {
        // Arrange
        var userId = "user-123";
        var query = "Test";
        var customTopK = 10;
        var customThreshold = 0.5f;
        var embedding = new List<double> { 0.1 };

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding });

        _mockVectorStore.Setup(v => v.SearchAsync(
                embedding, userId, customTopK, customThreshold, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        // Act
        await _sut.RetrieveContextAsync(query, userId, topK: customTopK, similarityThreshold: customThreshold);

        // Assert
        _mockVectorStore.Verify(v => v.SearchAsync(
            embedding, userId, customTopK, customThreshold, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RetrieveContextAsync_WhenExceptionOccurs_ReturnsEmptyContext()
    {
        // Arrange
        var userId = "user-123";
        var query = "Test";

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Unexpected error"));

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.Should().NotBeNull();
        result.RetrievedNotes.Should().BeEmpty();
        result.FormattedContext.Should().BeEmpty();
    }

    [Fact]
    public async Task RetrieveContextAsync_FormattedContextIncludesRelevanceScores()
    {
        // Arrange
        var userId = "user-123";
        var query = "Test";
        var embedding = new List<double> { 0.1 };
        var searchResults = new List<VectorSearchResult>
        {
            CreateSearchResult("note-1", "High Relevance Note", 0.95f)
        };

        _mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(query, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding });

        _mockVectorStore.Setup(v => v.SearchAsync(
                It.IsAny<List<double>>(), userId, It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(searchResults);

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.FormattedContext.Should().Contain("0.95");
        result.FormattedContext.Should().Contain("High Relevance Note");
    }

    #endregion

    #region EnhancePromptWithContext Tests

    [Fact]
    public void EnhancePromptWithContext_WhenContextIsEmpty_ReturnsNoContextFoundPrompt()
    {
        // Arrange
        var originalPrompt = "What are my notes about?";
        var context = new RagContext
        {
            FormattedContext = "",
            RetrievedNotes = new List<VectorSearchResult>()
        };

        // Act
        var result = _sut.EnhancePromptWithContext(originalPrompt, context);

        // Assert
        result.Should().Contain("NO relevant notes were found");
        result.Should().Contain(originalPrompt);
        result.Should().Contain("USER QUERY:");
    }

    [Fact]
    public void EnhancePromptWithContext_WhenContextExists_ReturnsEnhancedPrompt()
    {
        // Arrange
        var originalPrompt = "Tell me about authentication";
        var context = new RagContext
        {
            FormattedContext = "=== NOTE 1 ===\nTitle: Auth Guide\nContent: Use JWT tokens for authentication.",
            RetrievedNotes = new List<VectorSearchResult>
            {
                CreateSearchResult("note-1", "Auth Guide", 0.9f)
            }
        };

        // Act
        var result = _sut.EnhancePromptWithContext(originalPrompt, context);

        // Assert
        result.Should().Contain("RETRIEVED NOTES FROM KNOWLEDGE BASE:");
        result.Should().Contain("Auth Guide");
        result.Should().Contain("JWT tokens");
        result.Should().Contain(originalPrompt);
        result.Should().Contain("Citation Rule");
    }

    [Fact]
    public void EnhancePromptWithContext_IncludesInstructions()
    {
        // Arrange
        var context = new RagContext
        {
            FormattedContext = "Some context",
            RetrievedNotes = new List<VectorSearchResult> { CreateSearchResult("note-1", "Test", 0.8f) }
        };

        // Act
        var result = _sut.EnhancePromptWithContext("Question", context);

        // Assert
        result.Should().Contain("INSTRUCTIONS:");
        result.Should().Contain("Answer the user's query");
    }

    [Fact]
    public void EnhancePromptWithContext_WhenWhitespaceOnlyContext_TreatsAsEmpty()
    {
        // Arrange
        var context = new RagContext
        {
            FormattedContext = "   \n\t  ",
            RetrievedNotes = new List<VectorSearchResult>()
        };

        // Act
        var result = _sut.EnhancePromptWithContext("Test", context);

        // Assert
        result.Should().Contain("NO relevant notes were found");
    }

    #endregion

    #region Helper Methods

    private static VectorSearchResult CreateSearchResult(string noteId, string title, float score)
    {
        return new VectorSearchResult
        {
            Id = $"embedding-{noteId}",
            NoteId = noteId,
            NoteTitle = title,
            Content = $"Title: {title}\n\nThis is the content of {title}.",
            SimilarityScore = score,
            NoteTags = new List<string> { "test" },
            ChunkIndex = 0
        };
    }

    #endregion
}

