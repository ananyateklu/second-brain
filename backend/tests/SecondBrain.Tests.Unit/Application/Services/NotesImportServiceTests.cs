using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.Application.Services;

/// <summary>
/// Tests for NotesImportService.
/// Since NotesImportService now delegates to INoteOperationService,
/// these tests verify the delegation behavior and error handling.
/// </summary>
public class NotesImportServiceTests
{
    private readonly Mock<INoteOperationService> _mockOperationService;
    private readonly Mock<ILogger<NotesImportService>> _mockLogger;
    private readonly NotesImportService _sut;

    public NotesImportServiceTests()
    {
        _mockOperationService = new Mock<INoteOperationService>();
        _mockLogger = new Mock<ILogger<NotesImportService>>();
        _sut = new NotesImportService(_mockOperationService.Object, _mockLogger.Object);
    }

    #region ImportAsync Tests

    [Fact]
    public async Task ImportAsync_WhenSuccessful_ReturnsServiceResponse()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1"),
            CreateTestImportRequest("Note 2", "Content 2", "ext-2")
        };

        var expectedResponse = new ImportNotesResponse
        {
            ImportedCount = 2,
            UpdatedCount = 0,
            SkippedCount = 0,
            Notes = new List<ImportNoteResult>
            {
                new() { Id = "note-1", Title = "Note 1", Status = "created", Message = "Note successfully imported" },
                new() { Id = "note-2", Title = "Note 2", Status = "created", Message = "Note successfully imported" }
            }
        };

        _mockOperationService
            .Setup(s => s.ImportBatchAsync(userId, It.IsAny<IReadOnlyCollection<ImportNoteRequest>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(expectedResponse));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(2);
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().HaveCount(2);

        _mockOperationService.Verify(
            s => s.ImportBatchAsync(userId, notes, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ImportAsync_WhenMixedNewAndExisting_ReturnsMixedCounts()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("New Note", "Content", "ext-new"),
            CreateTestImportRequest("Updated Note", "Updated Content", "ext-existing")
        };

        var expectedResponse = new ImportNotesResponse
        {
            ImportedCount = 1,
            UpdatedCount = 1,
            SkippedCount = 0,
            Notes = new List<ImportNoteResult>
            {
                new() { Id = "note-1", Title = "New Note", Status = "created", Message = "Note successfully imported" },
                new() { Id = "note-2", Title = "Updated Note", Status = "updated", Message = "Note successfully updated" }
            }
        };

        _mockOperationService
            .Setup(s => s.ImportBatchAsync(userId, It.IsAny<IReadOnlyCollection<ImportNoteRequest>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(expectedResponse));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(1);
        result.UpdatedCount.Should().Be(1);
        result.SkippedCount.Should().Be(0);
    }

    [Fact]
    public async Task ImportAsync_WhenServiceFails_ReturnsErrorResponse()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1")
        };

        _mockOperationService
            .Setup(s => s.ImportBatchAsync(userId, It.IsAny<IReadOnlyCollection<ImportNoteRequest>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Failure(new Error("ImportFailed", "Database connection failed")));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(notes.Count);
        result.Notes.Should().HaveCount(notes.Count);
        result.Notes.All(n => n.Status == "skipped").Should().BeTrue();
        result.Notes.All(n => n.Message!.Contains("Database connection failed")).Should().BeTrue();
    }

    [Fact]
    public async Task ImportAsync_WhenEmptyList_DelegatesToService()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>();

        var expectedResponse = new ImportNotesResponse
        {
            ImportedCount = 0,
            UpdatedCount = 0,
            SkippedCount = 0,
            Notes = new List<ImportNoteResult>()
        };

        _mockOperationService
            .Setup(s => s.ImportBatchAsync(userId, It.IsAny<IReadOnlyCollection<ImportNoteRequest>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(expectedResponse));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().BeEmpty();

        _mockOperationService.Verify(
            s => s.ImportBatchAsync(userId, notes, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ImportAsync_WhenPartialFailures_ReturnsPartialResponse()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1"),
            CreateTestImportRequest("Note 2", "Content 2", "ext-2"),
            CreateTestImportRequest("Note 3", "Content 3", "ext-3")
        };

        var expectedResponse = new ImportNotesResponse
        {
            ImportedCount = 2,
            UpdatedCount = 0,
            SkippedCount = 1,
            Notes = new List<ImportNoteResult>
            {
                new() { Id = "note-1", Title = "Note 1", Status = "created", Message = "Note successfully imported" },
                new() { Id = null, Title = "Note 2", Status = "skipped", Message = "Error: Duplicate content" },
                new() { Id = "note-3", Title = "Note 3", Status = "created", Message = "Note successfully imported" }
            }
        };

        _mockOperationService
            .Setup(s => s.ImportBatchAsync(userId, It.IsAny<IReadOnlyCollection<ImportNoteRequest>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(expectedResponse));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.ImportedCount.Should().Be(2);
        result.SkippedCount.Should().Be(1);
        result.Notes.Should().HaveCount(3);
        result.Notes.Count(n => n.Status == "created").Should().Be(2);
        result.Notes.Count(n => n.Status == "skipped").Should().Be(1);
    }

    #endregion

    #region Helper Methods

    private static ImportNoteRequest CreateTestImportRequest(string title, string content, string? externalId)
    {
        return new ImportNoteRequest
        {
            Title = title,
            Content = content,
            ExternalId = externalId,
            Folder = null,
            Tags = new List<string>(),
            Source = "ios_notes",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    #endregion
}
