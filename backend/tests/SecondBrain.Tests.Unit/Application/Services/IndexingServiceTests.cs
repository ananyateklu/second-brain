using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Application.Services;

public class IndexingServiceTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<IIndexingJobRepository> _mockIndexingJobRepository;
    private readonly Mock<IEmbeddingProviderFactory> _mockEmbeddingProviderFactory;
    private readonly Mock<IEmbeddingProvider> _mockEmbeddingProvider;
    private readonly Mock<IVectorStore> _mockVectorStore;
    private readonly Mock<IChunkingService> _mockChunkingService;
    private readonly Mock<IOptions<EmbeddingProvidersSettings>> _mockSettings;
    private readonly Mock<ILogger<IndexingService>> _mockLogger;
    private readonly Mock<IServiceScopeFactory> _mockServiceScopeFactory;
    private readonly TestServiceProvider _serviceProvider;
    private readonly Mock<IServiceScope> _mockServiceScope;
    private readonly IndexingService _sut;

    public IndexingServiceTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockIndexingJobRepository = new Mock<IIndexingJobRepository>();
        _mockEmbeddingProviderFactory = new Mock<IEmbeddingProviderFactory>();
        _mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        _mockVectorStore = new Mock<IVectorStore>();
        _mockChunkingService = new Mock<IChunkingService>();
        _mockSettings = new Mock<IOptions<EmbeddingProvidersSettings>>();
        _mockLogger = new Mock<ILogger<IndexingService>>();
        _mockServiceScopeFactory = new Mock<IServiceScopeFactory>();
        _mockServiceScope = new Mock<IServiceScope>();

        _mockSettings.Setup(s => s.Value).Returns(new EmbeddingProvidersSettings
        {
            DefaultProvider = "openai"
        });

        _mockEmbeddingProvider.Setup(p => p.ProviderName).Returns("openai");
        _mockEmbeddingProvider.Setup(p => p.ModelName).Returns("text-embedding-3-small");
        _mockEmbeddingProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockEmbeddingProvider.Setup(p => p.Dimensions).Returns(1536);
        _mockEmbeddingProvider.Setup(p => p.GetAvailableModelsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new EmbeddingModelInfo
                {
                    ModelId = "text-embedding-3-small",
                    DisplayName = "text-embedding-3-small",
                    Dimensions = 1536,
                    IsDefault = true
                }
            }.AsEnumerable());

        _mockEmbeddingProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>()))
            .Returns(_mockEmbeddingProvider.Object);

        // Create a concrete service provider that implements GetRequiredService
        _serviceProvider = new TestServiceProvider
        {
            IndexingJobRepository = _mockIndexingJobRepository.Object,
            NoteRepository = _mockNoteRepository.Object,
            EmbeddingProviderFactory = _mockEmbeddingProviderFactory.Object,
            VectorStore = _mockVectorStore.Object
        };

        // Setup service scope factory for background task
        _mockServiceScopeFactory.Setup(f => f.CreateScope()).Returns(_mockServiceScope.Object);
        _mockServiceScope.Setup(s => s.ServiceProvider).Returns(_serviceProvider);

        _sut = new IndexingService(
            _mockNoteRepository.Object,
            _mockIndexingJobRepository.Object,
            _mockEmbeddingProviderFactory.Object,
            _mockVectorStore.Object,
            _mockChunkingService.Object,
            _mockSettings.Object,
            _mockLogger.Object,
            _mockServiceScopeFactory.Object);
    }

    #region StartIndexingAsync Tests

    [Fact]
    public async Task StartIndexingAsync_WhenValidRequest_CreatesJobAndReturnsIt()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<Note>
        {
            CreateTestNote("note-1", userId, "Note 1"),
            CreateTestNote("note-2", userId, "Note 2")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        _mockIndexingJobRepository.Setup(r => r.CreateAsync(It.IsAny<IndexingJob>()))
            .ReturnsAsync((IndexingJob job) => job);

        // Act
        var result = await _sut.StartIndexingAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.Status.Should().Be(IndexingStatus.Pending);
        result.TotalNotes.Should().Be(2);
        result.EmbeddingProvider.Should().Be("openai");

        _mockNoteRepository.Verify(r => r.GetByUserIdAsync(userId), Times.Once);
        _mockIndexingJobRepository.Verify(r => r.CreateAsync(It.Is<IndexingJob>(j =>
            j.UserId == userId &&
            j.Status == IndexingStatus.Pending &&
            j.TotalNotes == 2
        )), Times.Once);
    }

    [Fact]
    public async Task StartIndexingAsync_WhenCustomProvider_CreatesJobWithCustomProvider()
    {
        // Arrange
        var userId = "user-123";
        var customProvider = "gemini";
        var notes = new List<Note> { CreateTestNote("note-1", userId, "Note 1") };

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        _mockIndexingJobRepository.Setup(r => r.CreateAsync(It.IsAny<IndexingJob>()))
            .ReturnsAsync((IndexingJob job) => job);

        // Act
        var result = await _sut.StartIndexingAsync(userId, customProvider);

        // Assert
        result.EmbeddingProvider.Should().Be(customProvider);
    }

    [Fact]
    public async Task StartIndexingAsync_WhenNoNotes_CreatesJobWithZeroTotalNotes()
    {
        // Arrange
        var userId = "user-123";
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());

        _mockIndexingJobRepository.Setup(r => r.CreateAsync(It.IsAny<IndexingJob>()))
            .ReturnsAsync((IndexingJob job) => job);

        // Act
        var result = await _sut.StartIndexingAsync(userId);

        // Assert
        result.TotalNotes.Should().Be(0);
    }

    #endregion

    #region GetIndexingStatusAsync Tests

    [Fact]
    public async Task GetIndexingStatusAsync_WhenJobExists_ReturnsJob()
    {
        // Arrange
        var jobId = "job-123";
        var job = new IndexingJob
        {
            Id = jobId,
            UserId = "user-123",
            Status = IndexingStatus.Running,
            TotalNotes = 10,
            ProcessedNotes = 5
        };

        _mockIndexingJobRepository.Setup(r => r.GetByIdAsync(jobId))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.GetIndexingStatusAsync(jobId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(jobId);
        result.Status.Should().Be(IndexingStatus.Running);
        result.ProcessedNotes.Should().Be(5);

        _mockIndexingJobRepository.Verify(r => r.GetByIdAsync(jobId), Times.Once);
    }

    [Fact]
    public async Task GetIndexingStatusAsync_WhenJobDoesNotExist_ReturnsNull()
    {
        // Arrange
        var jobId = "non-existent";
        _mockIndexingJobRepository.Setup(r => r.GetByIdAsync(jobId))
            .ReturnsAsync((IndexingJob?)null);

        // Act
        var result = await _sut.GetIndexingStatusAsync(jobId);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetIndexStatsAsync Tests

    [Fact]
    public async Task GetIndexStatsAsync_WhenStatsExist_ReturnsStats()
    {
        // Arrange
        var userId = "user-123";
        var expectedStats = new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = 100,
            UniqueNotes = 50,
            LastIndexedAt = DateTime.UtcNow,
            EmbeddingProvider = "openai",
            VectorStoreProvider = "postgresql"
        };

        _mockVectorStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedStats);

        // Act
        var result = await _sut.GetIndexStatsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.TotalEmbeddings.Should().Be(100);
        result.UniqueNotes.Should().Be(50);

        _mockVectorStore.Verify(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region ReindexNoteAsync Tests

    [Fact]
    public async Task ReindexNoteAsync_WhenNoteExists_ReindexesAndReturnsTrue()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-123";
        var note = CreateTestNote(noteId, userId, "Test Note");

        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        mockEmbeddingProvider.Setup(p => p.ProviderName).Returns("openai");
        mockEmbeddingProvider.Setup(p => p.ModelName).Returns("text-embedding-ada-002");
        mockEmbeddingProvider.Setup(p => p.IsEnabled).Returns(true);

        var chunks = new List<NoteChunk>
        {
            new NoteChunk { Content = "Chunk 1", ChunkIndex = 0 },
            new NoteChunk { Content = "Chunk 2", ChunkIndex = 1 }
        };

        var embeddingResponse = new EmbeddingResponse
        {
            Success = true,
            Embedding = new List<double> { 0.1, 0.2, 0.3 }
        };

        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        _mockEmbeddingProviderFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);

        _mockChunkingService.Setup(s => s.ChunkNote(note))
            .Returns(chunks);

        mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddingResponse);

        _mockVectorStore.Setup(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _mockVectorStore.Setup(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ReindexNoteAsync(noteId);

        // Assert
        result.Should().BeTrue();

        _mockNoteRepository.Verify(r => r.GetByIdAsync(noteId), Times.Once);
        _mockEmbeddingProviderFactory.Verify(f => f.GetDefaultProvider(), Times.Once);
        _mockChunkingService.Verify(s => s.ChunkNote(note), Times.Once);
        _mockVectorStore.Verify(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()), Times.Once);
        _mockVectorStore.Verify(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ReindexNoteAsync_WhenNoteDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var noteId = "non-existent";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.ReindexNoteAsync(noteId);

        // Assert
        result.Should().BeFalse();
        _mockNoteRepository.Verify(r => r.GetByIdAsync(noteId), Times.Once);
        _mockVectorStore.Verify(s => s.DeleteByNoteIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ReindexNoteAsync_WhenEmbeddingFails_StillReturnsTrue()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-123";
        var note = CreateTestNote(noteId, userId, "Test Note");

        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        mockEmbeddingProvider.Setup(p => p.ProviderName).Returns("openai");
        mockEmbeddingProvider.Setup(p => p.ModelName).Returns("text-embedding-ada-002");
        mockEmbeddingProvider.Setup(p => p.IsEnabled).Returns(true);

        var chunks = new List<NoteChunk>
        {
            new NoteChunk { Content = "Chunk 1", ChunkIndex = 0 }
        };

        var failedEmbeddingResponse = new EmbeddingResponse
        {
            Success = false,
            Error = "API Error"
        };

        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        _mockEmbeddingProviderFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);

        _mockChunkingService.Setup(s => s.ChunkNote(note))
            .Returns(chunks);

        mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(failedEmbeddingResponse);

        _mockVectorStore.Setup(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ReindexNoteAsync(noteId);

        // Assert
        result.Should().BeTrue();
        _mockVectorStore.Verify(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ReindexNoteAsync_WhenExceptionOccurs_ReturnsFalse()
    {
        // Arrange
        var noteId = "note-123";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.ReindexNoteAsync(noteId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task ReindexNoteAsync_DeletesExistingEmbeddingsBeforeIndexing()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-123";
        var note = CreateTestNote(noteId, userId, "Test Note");

        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        mockEmbeddingProvider.Setup(p => p.ProviderName).Returns("openai");
        mockEmbeddingProvider.Setup(p => p.ModelName).Returns("text-embedding-ada-002");
        mockEmbeddingProvider.Setup(p => p.IsEnabled).Returns(true);

        var chunks = new List<NoteChunk>
        {
            new NoteChunk { Content = "Chunk 1", ChunkIndex = 0 }
        };

        var embeddingResponse = new EmbeddingResponse
        {
            Success = true,
            Embedding = new List<double> { 0.1, 0.2, 0.3 }
        };

        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        _mockEmbeddingProviderFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);

        _mockChunkingService.Setup(s => s.ChunkNote(note))
            .Returns(chunks);

        mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddingResponse);

        _mockVectorStore.Setup(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _mockVectorStore.Setup(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await _sut.ReindexNoteAsync(noteId);

        // Assert
        _mockVectorStore.Verify(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string id, string userId, string title)
    {
        return new Note
        {
            Id = id,
            UserId = userId,
            Title = title,
            Content = $"Content for {title}",
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion

    #region Test Service Provider

    private class TestServiceProvider : IServiceProvider
    {
        public IIndexingJobRepository IndexingJobRepository { get; set; } = null!;
        public INoteRepository NoteRepository { get; set; } = null!;
        public IEmbeddingProviderFactory EmbeddingProviderFactory { get; set; } = null!;
        public IVectorStore VectorStore { get; set; } = null!;

        public object? GetService(Type serviceType)
        {
            if (serviceType == typeof(IIndexingJobRepository)) return IndexingJobRepository;
            if (serviceType == typeof(INoteRepository)) return NoteRepository;
            if (serviceType == typeof(IEmbeddingProviderFactory)) return EmbeddingProviderFactory;
            if (serviceType == typeof(IVectorStore)) return VectorStore;
            return null;
        }
    }

    #endregion
}

