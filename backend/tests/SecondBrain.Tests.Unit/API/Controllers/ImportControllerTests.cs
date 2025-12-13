using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.Import.ImportNotes;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class ImportControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly Mock<ILogger<ImportController>> _mockLogger;
    private readonly ImportController _sut;

    public ImportControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _mockLogger = new Mock<ILogger<ImportController>>();

        _sut = new ImportController(
            _mockMediator.Object,
            _mockLogger.Object
        );

        SetupUnauthenticatedUser();
    }

    #region ImportNotes Tests - Authentication

    [Fact]
    public async Task ImportNotes_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated (default setup)

        // Act
        var result = await _sut.ImportNotes(CancellationToken.None);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Not authenticated" });
    }

    [Fact]
    public async Task ImportNotes_WhenAuthenticated_ProcessesRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{""notes"": [{""title"": ""Test Note"", ""body"": ""Content""}]}");

        var importResponse = new ImportNotesResponse
        {
            ImportedCount = 1,
            UpdatedCount = 0,
            SkippedCount = 0
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<ImportNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(importResponse));

        // Act
        var result = await _sut.ImportNotes(CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImportNotesResponse>().Subject;
        response.ImportedCount.Should().Be(1);
    }

    #endregion

    #region ImportNotes Tests - Validation

    [Fact]
    public async Task ImportNotes_WithEmptyNotesArray_ThrowsValidationException()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{""notes"": []}");

        // Act & Assert
        // The controller validates notes before calling MediatR, so it throws ValidationException
        await Assert.ThrowsAsync<ValidationException>(() => _sut.ImportNotes(CancellationToken.None));
    }

    [Fact]
    public async Task ImportNotes_WithInvalidJson_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody("invalid json");

        // Act & Assert
        await Assert.ThrowsAnyAsync<System.Text.Json.JsonException>(() => _sut.ImportNotes(CancellationToken.None));
    }

    #endregion

    #region ImportNotes Tests - Success Cases

    [Fact]
    public async Task ImportNotes_WithSingleNote_ReturnsCorrectCounts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{""title"": ""Single Note"", ""body"": ""Content""}");

        var importResponse = new ImportNotesResponse
        {
            ImportedCount = 1,
            UpdatedCount = 0,
            SkippedCount = 0,
            Notes = new List<ImportNoteResult>
            {
                new ImportNoteResult
                {
                    Title = "Single Note",
                    Status = "created",
                    Id = "note-1"
                }
            }
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<ImportNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(importResponse));

        // Act
        var result = await _sut.ImportNotes(CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImportNotesResponse>().Subject;
        response.ImportedCount.Should().Be(1);
        response.Notes.Should().HaveCount(1);
    }

    [Fact]
    public async Task ImportNotes_WithMultipleNotes_ProcessesAll()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{
            ""notes"": [
                {""title"": ""Note 1"", ""body"": ""Content 1""},
                {""title"": ""Note 2"", ""body"": ""Content 2""},
                {""title"": ""Note 3"", ""body"": ""Content 3""}
            ]
        }");

        var importResponse = new ImportNotesResponse
        {
            ImportedCount = 2,
            UpdatedCount = 1,
            SkippedCount = 0
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<ImportNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Success(importResponse));

        // Act
        var result = await _sut.ImportNotes(CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImportNotesResponse>().Subject;
        response.ImportedCount.Should().Be(2);
        response.UpdatedCount.Should().Be(1);
    }

    [Fact]
    public async Task ImportNotes_PassesUserIdToMediator()
    {
        // Arrange
        var userId = "specific-user-id";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{""title"": ""Test Note"", ""body"": ""Content""}");

        ImportNotesCommand? capturedCommand = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<ImportNotesCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<ImportNotesResponse>>, CancellationToken>((cmd, _) => capturedCommand = (ImportNotesCommand)cmd)
            .ReturnsAsync(Result<ImportNotesResponse>.Success(new ImportNotesResponse { ImportedCount = 1 }));

        // Act
        await _sut.ImportNotes(CancellationToken.None);

        // Assert
        capturedCommand.Should().NotBeNull();
        capturedCommand!.UserId.Should().Be(userId);
    }

    #endregion

    #region ImportNotes Tests - Error Cases

    [Fact]
    public async Task ImportNotes_WhenMediatorReturnsFailure_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        SetupRequestBody(@"{""title"": ""Test Note"", ""body"": ""Content""}");

        _mockMediator
            .Setup(m => m.Send(It.IsAny<ImportNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ImportNotesResponse>.Failure(Error.Internal("Database error")));

        // Act
        var result = await _sut.ImportNotes(CancellationToken.None);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
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

    private void SetupRequestBody(string json)
    {
        var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
        _sut.ControllerContext.HttpContext.Request.Body = stream;
        _sut.ControllerContext.HttpContext.Request.ContentLength = stream.Length;
    }

    #endregion
}
