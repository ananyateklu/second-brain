using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class IndexingControllerTests
{
    private readonly Mock<IIndexingService> _mockIndexingService;
    private readonly Mock<IVectorStore> _mockPostgresStore;
    private readonly Mock<IVectorStore> _mockPineconeStore;
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<ILogger<IndexingController>> _mockLogger;
    private readonly IndexingController _sut;

    public IndexingControllerTests()
    {
        _mockIndexingService = new Mock<IIndexingService>();
        _mockPostgresStore = new Mock<IVectorStore>();
        _mockPineconeStore = new Mock<IVectorStore>();
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockLogger = new Mock<ILogger<IndexingController>>();

        // Default setup for note repository
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<Note>());

        _sut = new IndexingController(
            _mockIndexingService.Object,
            _mockPostgresStore.Object,
            _mockPineconeStore.Object,
            _mockNoteRepository.Object,
            _mockLogger.Object
        );

        SetupUnauthenticatedUser();
    }

    #region StartIndexing Tests

    [Fact]
    public async Task StartIndexing_WhenSuccessful_ReturnsOkWithJobResponse()
    {
        // Arrange
        var userId = "user-123";
        var job = CreateTestIndexingJob("job-1", userId);
        _mockIndexingService.Setup(s => s.StartIndexingAsync(userId, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.StartIndexing(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        response.Id.Should().Be("job-1");
        response.Status.Should().Be(IndexingStatus.Running);
    }

    [Fact]
    public async Task StartIndexing_WithEmbeddingProvider_PassesToService()
    {
        // Arrange
        var userId = "user-123";
        var embeddingProvider = "openai";
        var job = CreateTestIndexingJob("job-1", userId);
        _mockIndexingService.Setup(s => s.StartIndexingAsync(userId, embeddingProvider, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.StartIndexing(userId, embeddingProvider);

        // Assert
        _mockIndexingService.Verify(s => s.StartIndexingAsync(userId, embeddingProvider, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartIndexing_WithVectorStoreProvider_PassesToService()
    {
        // Arrange
        var userId = "user-123";
        var vectorStoreProvider = "postgresql";
        var job = CreateTestIndexingJob("job-1", userId);
        _mockIndexingService.Setup(s => s.StartIndexingAsync(userId, null, vectorStoreProvider, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.StartIndexing(userId, null, vectorStoreProvider);

        // Assert
        _mockIndexingService.Verify(s => s.StartIndexingAsync(userId, null, vectorStoreProvider, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartIndexing_WhenExceptionThrown_Returns500()
    {
        // Arrange
        _mockIndexingService.Setup(s => s.StartIndexingAsync(It.IsAny<string>(), null, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.StartIndexing();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task StartIndexing_UsesDefaultUserIdWhenNotProvided()
    {
        // Arrange
        var job = CreateTestIndexingJob("job-1", "default-user");
        _mockIndexingService.Setup(s => s.StartIndexingAsync("default-user", null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.StartIndexing();

        // Assert
        _mockIndexingService.Verify(s => s.StartIndexingAsync("default-user", null, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartIndexing_MapsAllJobPropertiesToResponse()
    {
        // Arrange
        var job = new IndexingJob
        {
            Id = "job-1",
            UserId = "user-123",
            Status = IndexingStatus.Running,
            TotalNotes = 10,
            ProcessedNotes = 5,
            TotalChunks = 20,
            ProcessedChunks = 10,
            Errors = new List<string> { "Error 1" },
            EmbeddingProvider = "openai",
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = null,
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        _mockIndexingService.Setup(s => s.StartIndexingAsync(It.IsAny<string>(), null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.StartIndexing();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        response.TotalNotes.Should().Be(10);
        response.ProcessedNotes.Should().Be(5);
        response.TotalChunks.Should().Be(20);
        response.ProcessedChunks.Should().Be(10);
        response.Errors.Should().Contain("Error 1");
        response.EmbeddingProvider.Should().Be("openai");
    }

    #endregion

    #region GetIndexingStatus Tests

    [Fact]
    public async Task GetIndexingStatus_WhenJobExists_ReturnsOkWithJobResponse()
    {
        // Arrange
        var jobId = "job-123";
        var job = CreateTestIndexingJob(jobId, "user-123");
        _mockIndexingService.Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.GetIndexingStatus(jobId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        response.Id.Should().Be(jobId);
    }

    [Fact]
    public async Task GetIndexingStatus_WhenJobNotFound_ReturnsNotFound()
    {
        // Arrange
        var jobId = "non-existent";
        _mockIndexingService.Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IndexingJob?)null);

        // Act
        var result = await _sut.GetIndexingStatus(jobId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetIndexingStatus_WhenExceptionThrown_Returns500()
    {
        // Arrange
        _mockIndexingService.Setup(s => s.GetIndexingStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetIndexingStatus("job-123");

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetIndexingStatus_MapsAllPropertiesToResponse()
    {
        // Arrange
        var job = new IndexingJob
        {
            Id = "job-1",
            Status = IndexingStatus.Completed,
            TotalNotes = 100,
            ProcessedNotes = 100,
            TotalChunks = 500,
            ProcessedChunks = 500,
            CompletedAt = DateTime.UtcNow
        };
        _mockIndexingService.Setup(s => s.GetIndexingStatusAsync("job-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.GetIndexingStatus("job-1");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        response.Status.Should().Be(IndexingStatus.Completed);
        response.TotalNotes.Should().Be(100);
        response.ProcessedNotes.Should().Be(100);
        response.CompletedAt.Should().NotBeNull();
    }

    #endregion

    #region GetIndexStats Tests

    [Fact]
    public async Task GetIndexStats_ReturnsOkWithBothProviderStats()
    {
        // Arrange
        var userId = "user-123";
        var postgresStats = CreateTestIndexStats(userId, "PostgreSQL", 100, 10);
        var pineconeStats = CreateTestIndexStats(userId, "Pinecone", 200, 20);

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(postgresStats);
        _mockPostgresStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(pineconeStats);
        _mockPineconeStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        response.PostgreSQL.Should().NotBeNull();
        response.PostgreSQL!.TotalEmbeddings.Should().Be(100);
        response.Pinecone.Should().NotBeNull();
        response.Pinecone!.TotalEmbeddings.Should().Be(200);
    }

    [Fact]
    public async Task GetIndexStats_WhenPostgresThrows_ContinuesToPinecone()
    {
        // Arrange
        var userId = "user-123";
        var pineconeStats = CreateTestIndexStats(userId, "Pinecone", 200, 20);

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Postgres error"));
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(pineconeStats);
        _mockPineconeStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        response.PostgreSQL.Should().BeNull();
        response.Pinecone.Should().NotBeNull();
    }

    [Fact]
    public async Task GetIndexStats_WhenPineconeThrows_StillReturnsPostgres()
    {
        // Arrange
        var userId = "user-123";
        var postgresStats = CreateTestIndexStats(userId, "PostgreSQL", 100, 10);

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(postgresStats);
        _mockPostgresStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Pinecone error"));

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        response.PostgreSQL.Should().NotBeNull();
        response.Pinecone.Should().BeNull();
    }

    [Fact]
    public async Task GetIndexStats_UsesDefaultUserIdWhenNotProvided()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync("default-user"))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync("default-user", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestIndexStats("default-user", "PostgreSQL", 0, 0));
        _mockPostgresStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync("default-user", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync("default-user", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestIndexStats("default-user", "Pinecone", 0, 0));
        _mockPineconeStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync("default-user", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());

        // Act
        await _sut.GetIndexStats();

        // Assert
        _mockPostgresStore.Verify(s => s.GetIndexStatsAsync("default-user", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetIndexStats_MapsStatsPropertiesCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var lastIndexed = DateTime.UtcNow;
        var postgresStats = new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = 150,
            UniqueNotes = 15,
            LastIndexedAt = lastIndexed,
            EmbeddingProvider = "openai",
            VectorStoreProvider = "PostgreSQL"
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(postgresStats);
        _mockPostgresStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestIndexStats(userId, "Pinecone", 0, 0));
        _mockPineconeStore.Setup(s => s.GetIndexedNotesWithTimestampsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, DateTime?>());

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        response.PostgreSQL!.TotalEmbeddings.Should().Be(150);
        response.PostgreSQL.UniqueNotes.Should().Be(15);
        response.PostgreSQL.EmbeddingProvider.Should().Be("openai");
        response.PostgreSQL.VectorStoreProvider.Should().Be("PostgreSQL");
    }

    [Fact]
    public async Task GetIndexStats_WhenBothStoresThrow_ReturnsEmptyResponse()
    {
        // Arrange
        var userId = "user-123";
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());
        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Postgres error"));
        _mockPineconeStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Pinecone error"));

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        response.PostgreSQL.Should().BeNull();
        response.Pinecone.Should().BeNull();
    }

    #endregion

    #region ReindexNote Tests

    [Fact]
    public async Task ReindexNote_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var noteId = "note-123";
        _mockIndexingService.Setup(s => s.ReindexNoteAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ReindexNote(noteId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task ReindexNote_WhenNotFoundOrFailed_ReturnsNotFound()
    {
        // Arrange
        var noteId = "non-existent";
        _mockIndexingService.Setup(s => s.ReindexNoteAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.ReindexNote(noteId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task ReindexNote_WhenExceptionThrown_Returns500()
    {
        // Arrange
        _mockIndexingService.Setup(s => s.ReindexNoteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Indexing error"));

        // Act
        var result = await _sut.ReindexNote("note-123");

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task ReindexNote_ReturnsSuccessMessage()
    {
        // Arrange
        var noteId = "note-123";
        _mockIndexingService.Setup(s => s.ReindexNoteAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ReindexNote(noteId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Note reindexed successfully" });
    }

    #endregion

    #region DeleteIndexedNotes Tests

    [Fact]
    public async Task DeleteIndexedNotes_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated (default setup)

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenVectorStoreProviderMissing_ReturnsBadRequest()
    {
        // Arrange
        SetupAuthenticatedUser("user-123");

        // Act
        var result = await _sut.DeleteIndexedNotes(null);

        // Assert
        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "vectorStoreProvider is required" });
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenVectorStoreProviderEmpty_ReturnsBadRequest()
    {
        // Arrange
        SetupAuthenticatedUser("user-123");

        // Act
        var result = await _sut.DeleteIndexedNotes("");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteIndexedNotes_WithInvalidProvider_ReturnsBadRequest()
    {
        // Arrange
        SetupAuthenticatedUser("user-123");

        // Act
        var result = await _sut.DeleteIndexedNotes("InvalidProvider");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteIndexedNotes_WithPostgreSQL_CallsPostgresStore()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockPostgresStore.Verify(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteIndexedNotes_WithPinecone_CallsPineconeStore()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPineconeStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteIndexedNotes("Pinecone");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockPineconeStore.Verify(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenDeleteFails_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenExceptionThrown_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Delete error"));

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task DeleteIndexedNotes_IsCaseInsensitive()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteIndexedNotes("postgresql");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockPostgresStore.Verify(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteIndexedNotes_ReturnsSuccessMessage()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Successfully deleted indexed notes from PostgreSQL" });
    }

    [Fact]
    public async Task DeleteIndexedNotes_DoesNotCallPineconeForPostgreSQL()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        _mockPineconeStore.Verify(s => s.DeleteByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteIndexedNotes_DoesNotCallPostgresForPinecone()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockPineconeStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await _sut.DeleteIndexedNotes("Pinecone");

        // Assert
        _mockPostgresStore.Verify(s => s.DeleteByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region IndexingJobResponse DTO Tests

    [Fact]
    public void IndexingJobResponse_ProgressPercentage_CalculatesCorrectly()
    {
        // Arrange
        var response = new IndexingJobResponse
        {
            TotalNotes = 100,
            ProcessedNotes = 50
        };

        // Assert
        response.ProgressPercentage.Should().Be(50);
    }

    [Fact]
    public void IndexingJobResponse_ProgressPercentage_ReturnsZeroWhenNoNotes()
    {
        // Arrange
        var response = new IndexingJobResponse
        {
            TotalNotes = 0,
            ProcessedNotes = 0
        };

        // Assert
        response.ProgressPercentage.Should().Be(0);
    }

    [Fact]
    public void IndexingJobResponse_ProgressPercentage_Returns100WhenComplete()
    {
        // Arrange
        var response = new IndexingJobResponse
        {
            TotalNotes = 50,
            ProcessedNotes = 50
        };

        // Assert
        response.ProgressPercentage.Should().Be(100);
    }

    #endregion

    #region VectorStoreKeys Tests

    [Fact]
    public void VectorStoreKeys_PostgreSQL_HasCorrectValue()
    {
        // Assert
        VectorStoreKeys.PostgreSQL.Should().Be("PostgreSQL");
    }

    [Fact]
    public void VectorStoreKeys_Pinecone_HasCorrectValue()
    {
        // Assert
        VectorStoreKeys.Pinecone.Should().Be("Pinecone");
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = userId;
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext();
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private static IndexingJob CreateTestIndexingJob(string id, string userId)
    {
        return new IndexingJob
        {
            Id = id,
            UserId = userId,
            Status = IndexingStatus.Running,
            TotalNotes = 10,
            ProcessedNotes = 0,
            TotalChunks = 0,
            ProcessedChunks = 0,
            Errors = new List<string>(),
            EmbeddingProvider = "openai",
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static IndexStats CreateTestIndexStats(string userId, string provider, int totalEmbeddings, int uniqueNotes)
    {
        return new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = totalEmbeddings,
            UniqueNotes = uniqueNotes,
            LastIndexedAt = DateTime.UtcNow,
            EmbeddingProvider = "openai",
            VectorStoreProvider = provider
        };
    }

    #endregion
}
