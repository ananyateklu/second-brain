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
    private readonly Mock<IHybridSearchService> _mockHybridSearchService;
    private readonly Mock<INativeHybridSearchService> _mockNativeHybridSearchService;
    private readonly Mock<IQueryExpansionService> _mockQueryExpansionService;
    private readonly Mock<IRerankerService> _mockRerankerService;
    private readonly Mock<ICohereRerankerService> _mockCohereRerankerService;
    private readonly Mock<IRagAnalyticsService> _mockRagAnalyticsService;
    private readonly Mock<INoteEmbeddingSearchRepository> _mockEmbeddingSearchRepository;
    private readonly Mock<IEmbeddingProvider> _mockEmbeddingProvider;
    private readonly Mock<ILogger<RagService>> _mockLogger;
    private readonly RagSettings _ragSettings;
    private readonly RagService _sut;

    public RagServiceTests()
    {
        _mockEmbeddingProviderFactory = new Mock<IEmbeddingProviderFactory>();
        _mockVectorStore = new Mock<IVectorStore>();
        _mockHybridSearchService = new Mock<IHybridSearchService>();
        _mockNativeHybridSearchService = new Mock<INativeHybridSearchService>();
        _mockQueryExpansionService = new Mock<IQueryExpansionService>();
        _mockRerankerService = new Mock<IRerankerService>();
        _mockCohereRerankerService = new Mock<ICohereRerankerService>();
        _mockRagAnalyticsService = new Mock<IRagAnalyticsService>();
        _mockEmbeddingSearchRepository = new Mock<INoteEmbeddingSearchRepository>();
        _mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        _mockLogger = new Mock<ILogger<RagService>>();

        _ragSettings = new RagSettings
        {
            TopK = 5,
            SimilarityThreshold = 0.7f,
            MaxContextLength = 4000,
            EnableNativeHybridSearch = false // Use standard hybrid search in tests
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
            _mockHybridSearchService.Object,
            _mockNativeHybridSearchService.Object,
            _mockQueryExpansionService.Object,
            _mockRerankerService.Object,
            _mockCohereRerankerService.Object,
            _mockRagAnalyticsService.Object,
            _mockEmbeddingSearchRepository.Object,
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

        var expandedEmbeddings = new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = embedding,
            TotalTokensUsed = 10
        };

        var hybridResults = new List<HybridSearchResult>
        {
            new HybridSearchResult
            {
                Id = "embedding-note-1",
                NoteId = "note-1",
                NoteTitle = "Auth Implementation",
                Content = "Title: Auth Implementation\n\nThis is the content of Auth Implementation.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.95f,
                RRFScore = 0.95f
            },
            new HybridSearchResult
            {
                Id = "embedding-note-2",
                NoteId = "note-2",
                NoteTitle = "Security Best Practices",
                Content = "Title: Security Best Practices\n\nThis is the content of Security Best Practices.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.85f,
                RRFScore = 0.85f
            }
        };

        var rerankedResults = new List<RerankedResult>
        {
            new RerankedResult
            {
                Id = "embedding-note-1",
                NoteId = "note-1",
                NoteTitle = "Auth Implementation",
                Content = "Title: Auth Implementation\n\nThis is the content of Auth Implementation.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.95f,
                RRFScore = 0.95f,
                RelevanceScore = 9.5f,
                FinalScore = 0.95f
            },
            new RerankedResult
            {
                Id = "embedding-note-2",
                NoteId = "note-2",
                NoteTitle = "Security Best Practices",
                Content = "Title: Security Best Practices\n\nThis is the content of Security Best Practices.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.85f,
                RRFScore = 0.85f,
                RelevanceScore = 8.5f,
                FinalScore = 0.85f
            }
        };

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expandedEmbeddings);

        _mockHybridSearchService.Setup(s => s.SearchAsync(
                query, embedding, userId, It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(hybridResults);

        _mockRerankerService.Setup(s => s.RerankAsync(
                query, It.IsAny<List<HybridSearchResult>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(rerankedResults);

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

        var expandedEmbeddings = new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = new List<double>(),
            TotalTokensUsed = 0
        };

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expandedEmbeddings);

        // Act
        var result = await _sut.RetrieveContextAsync(query, userId);

        // Assert
        result.Should().NotBeNull();
        result.RetrievedNotes.Should().BeEmpty();
        result.FormattedContext.Should().BeEmpty();
        _mockHybridSearchService.Verify(s => s.SearchAsync(
            It.IsAny<string>(), It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RetrieveContextAsync_WhenNoNotesFound_ReturnsEmptyFormattedContext()
    {
        // Arrange
        var userId = "user-123";
        var query = "Unrelated query with no matches";
        var embedding = new List<double> { 0.1, 0.2, 0.3 };

        var expandedEmbeddings = new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = embedding,
            TotalTokensUsed = 5
        };

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expandedEmbeddings);

        _mockHybridSearchService.Setup(s => s.SearchAsync(
                query, embedding, userId, It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HybridSearchResult>());

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

        var expandedEmbeddings = new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = embedding,
            TotalTokensUsed = 0
        };

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expandedEmbeddings);

        _mockHybridSearchService.Setup(s => s.SearchAsync(
                query, embedding, userId, It.IsAny<int>(), customThreshold, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HybridSearchResult>());

        _mockRerankerService.Setup(s => s.RerankAsync(
                query, It.IsAny<List<HybridSearchResult>>(), customTopK, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<RerankedResult>());

        // Act
        await _sut.RetrieveContextAsync(query, userId, topK: customTopK, similarityThreshold: customThreshold);

        // Assert
        _mockHybridSearchService.Verify(s => s.SearchAsync(
            query, embedding, userId, It.IsAny<int>(), customThreshold, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RetrieveContextAsync_WhenExceptionOccurs_ReturnsEmptyContext()
    {
        // Arrange
        var userId = "user-123";
        var query = "Test";

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
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

        var expandedEmbeddings = new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = embedding,
            TotalTokensUsed = 0
        };

        var hybridResults = new List<HybridSearchResult>
        {
            new HybridSearchResult
            {
                Id = "embedding-note-1",
                NoteId = "note-1",
                NoteTitle = "High Relevance Note",
                Content = "Title: High Relevance Note\n\nThis is the content of High Relevance Note.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.95f,
                RRFScore = 0.95f
            }
        };

        var rerankedResults = new List<RerankedResult>
        {
            new RerankedResult
            {
                Id = "embedding-note-1",
                NoteId = "note-1",
                NoteTitle = "High Relevance Note",
                Content = "Title: High Relevance Note\n\nThis is the content of High Relevance Note.",
                NoteTags = new List<string> { "test" },
                ChunkIndex = 0,
                VectorScore = 0.95f,
                RRFScore = 0.95f,
                RelevanceScore = 9.5f,
                FinalScore = 0.95f
            }
        };

        _mockQueryExpansionService.Setup(s => s.GetExpandedQueryEmbeddingsAsync(query, It.IsAny<bool?>(), It.IsAny<bool?>(), It.IsAny<RagOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expandedEmbeddings);

        _mockHybridSearchService.Setup(s => s.SearchAsync(
                query, embedding, userId, It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(hybridResults);

        _mockRerankerService.Setup(s => s.RerankAsync(
                query, It.IsAny<List<HybridSearchResult>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(rerankedResults);

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

