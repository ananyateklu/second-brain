using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.Indexing.CancelIndexing;
using SecondBrain.Application.Commands.Indexing.DeleteIndexedNotes;
using SecondBrain.Application.Commands.Indexing.ReindexNote;
using SecondBrain.Application.Commands.Indexing.StartIndexing;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Indexing.GetEmbeddingProviders;
using SecondBrain.Application.Queries.Indexing.GetIndexingStatus;
using SecondBrain.Application.Queries.Indexing.GetIndexStats;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class IndexingControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly IndexingController _sut;

    public IndexingControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _sut = new IndexingController(_mockMediator.Object);
        SetupUnauthenticatedUser();
    }

    #region StartIndexing Tests

    [Fact]
    public async Task StartIndexing_WhenSuccessful_ReturnsOkWithJobResponse()
    {
        // Arrange
        var userId = "user-123";
        var response = CreateTestJobResponse("job-1");
        _mockMediator.Setup(m => m.Send(It.IsAny<StartIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Success(response));

        // Act
        var result = await _sut.StartIndexing(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var jobResponse = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        jobResponse.Id.Should().Be("job-1");
        jobResponse.Status.Should().Be(IndexingStatus.Running);
    }

    [Fact]
    public async Task StartIndexing_WithEmbeddingProvider_PassesToCommand()
    {
        // Arrange
        var userId = "user-123";
        var embeddingProvider = "openai";
        var response = CreateTestJobResponse("job-1");
        _mockMediator.Setup(m => m.Send(It.IsAny<StartIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Success(response));

        // Act
        await _sut.StartIndexing(userId, embeddingProvider);

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<StartIndexingCommand>(c => c.UserId == userId && c.EmbeddingProvider == embeddingProvider),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartIndexing_WithVectorStoreProvider_PassesToCommand()
    {
        // Arrange
        var userId = "user-123";
        var vectorStoreProvider = "postgresql";
        var response = CreateTestJobResponse("job-1");
        _mockMediator.Setup(m => m.Send(It.IsAny<StartIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Success(response));

        // Act
        await _sut.StartIndexing(userId, null, vectorStoreProvider);

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<StartIndexingCommand>(c => c.UserId == userId && c.VectorStoreProvider == vectorStoreProvider),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartIndexing_WhenValidationFails_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        _mockMediator.Setup(m => m.Send(It.IsAny<StartIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Failure(Error.Custom("Validation", "Invalid model")));

        // Act
        var result = await _sut.StartIndexing(userId);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region GetIndexingStatus Tests

    [Fact]
    public async Task GetIndexingStatus_WhenJobExists_ReturnsOkWithResponse()
    {
        // Arrange
        var jobId = "job-123";
        var response = CreateTestJobResponse(jobId);
        _mockMediator.Setup(m => m.Send(It.IsAny<GetIndexingStatusQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Success(response));

        // Act
        var result = await _sut.GetIndexingStatus(jobId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var jobResponse = okResult.Value.Should().BeOfType<IndexingJobResponse>().Subject;
        jobResponse.Id.Should().Be(jobId);
    }

    [Fact]
    public async Task GetIndexingStatus_WhenJobNotFound_ReturnsNotFound()
    {
        // Arrange
        var jobId = "non-existent-job";
        _mockMediator.Setup(m => m.Send(It.IsAny<GetIndexingStatusQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Failure(Error.NotFound("Job not found")));

        // Act
        var result = await _sut.GetIndexingStatus(jobId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetIndexingStatus_PassesCorrectJobId()
    {
        // Arrange
        var jobId = "job-123";
        var response = CreateTestJobResponse(jobId);
        _mockMediator.Setup(m => m.Send(It.IsAny<GetIndexingStatusQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexingJobResponse>.Success(response));

        // Act
        await _sut.GetIndexingStatus(jobId);

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<GetIndexingStatusQuery>(q => q.JobId == jobId),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetIndexStats Tests

    [Fact]
    public async Task GetIndexStats_ReturnsOkWithStatsResponse()
    {
        // Arrange
        var userId = "user-123";
        var response = new IndexStatsResponse
        {
            PostgreSQL = new IndexStatsData { TotalEmbeddings = 100 },
            Pinecone = new IndexStatsData { TotalEmbeddings = 50 }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetIndexStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexStatsResponse>.Success(response));

        // Act
        var result = await _sut.GetIndexStats(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var statsResponse = okResult.Value.Should().BeOfType<IndexStatsResponse>().Subject;
        statsResponse.PostgreSQL!.TotalEmbeddings.Should().Be(100);
        statsResponse.Pinecone!.TotalEmbeddings.Should().Be(50);
    }

    [Fact]
    public async Task GetIndexStats_PassesCorrectUserId()
    {
        // Arrange
        var userId = "user-123";
        var response = new IndexStatsResponse();
        _mockMediator.Setup(m => m.Send(It.IsAny<GetIndexStatsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IndexStatsResponse>.Success(response));

        // Act
        await _sut.GetIndexStats(userId);

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<GetIndexStatsQuery>(q => q.UserId == userId),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region CancelIndexing Tests

    [Fact]
    public async Task CancelIndexing_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var jobId = "job-123";
        _mockMediator.Setup(m => m.Send(It.IsAny<CancelIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        // Act
        var result = await _sut.CancelIndexing(jobId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task CancelIndexing_WhenJobNotFound_ReturnsNotFound()
    {
        // Arrange
        var jobId = "non-existent-job";
        _mockMediator.Setup(m => m.Send(It.IsAny<CancelIndexingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Failure(Error.NotFound("Job not found")));

        // Act
        var result = await _sut.CancelIndexing(jobId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region ReindexNote Tests

    [Fact]
    public async Task ReindexNote_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var noteId = "note-123";
        _mockMediator.Setup(m => m.Send(It.IsAny<ReindexNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        // Act
        var result = await _sut.ReindexNote(noteId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task ReindexNote_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        var noteId = "non-existent-note";
        _mockMediator.Setup(m => m.Send(It.IsAny<ReindexNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Failure(Error.NotFound("Note not found")));

        // Act
        var result = await _sut.ReindexNote(noteId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region DeleteIndexedNotes Tests

    [Fact]
    public async Task DeleteIndexedNotes_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - default setup is unauthenticated

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
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        _mockMediator.Setup(m => m.Send(It.IsAny<DeleteIndexedNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));

        // Act
        var result = await _sut.DeleteIndexedNotes("PostgreSQL");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task DeleteIndexedNotes_WhenValidationFails_ReturnsBadRequest()
    {
        // Arrange
        SetupAuthenticatedUser("user-123");
        _mockMediator.Setup(m => m.Send(It.IsAny<DeleteIndexedNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Failure(Error.Custom("Validation", "Invalid vector store provider")));

        // Act
        var result = await _sut.DeleteIndexedNotes("InvalidStore");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region GetEmbeddingProviders Tests

    [Fact]
    public async Task GetEmbeddingProviders_ReturnsOkWithProviders()
    {
        // Arrange
        var providers = new List<EmbeddingProviderResponse>
        {
            new() { Name = "OpenAI", IsEnabled = true },
            new() { Name = "Ollama", IsEnabled = false }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetEmbeddingProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<EmbeddingProviderResponse>>.Success(providers));

        // Act
        var result = await _sut.GetEmbeddingProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<List<EmbeddingProviderResponse>>().Subject;
        response.Should().HaveCount(2);
        response[0].Name.Should().Be("OpenAI");
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

    private static IndexingJobResponse CreateTestJobResponse(string jobId)
    {
        return new IndexingJobResponse
        {
            Id = jobId,
            Status = IndexingStatus.Running,
            TotalNotes = 10,
            ProcessedNotes = 0,
            SkippedNotes = 0,
            DeletedNotes = 0,
            TotalChunks = 0,
            ProcessedChunks = 0,
            Errors = new List<string>(),
            EmbeddingProvider = "openai",
            EmbeddingModel = "text-embedding-3-small",
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
