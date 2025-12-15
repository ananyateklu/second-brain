using FluentAssertions;
using Moq;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Plugins;

/// <summary>
/// Unit tests for NoteCrudPlugin.
/// Tests CRUD operations: Create, Get, Update, Delete, Append, Duplicate.
/// </summary>
public class NoteCrudPluginTests
{
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly Mock<INoteOperationService> _mockNoteOperationService;
    private readonly NoteCrudPlugin _sut;
    private const string TestUserId = "user-123";

    public NoteCrudPluginTests()
    {
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _mockNoteOperationService = new Mock<INoteOperationService>();
        _sut = new NoteCrudPlugin(
            _mockNoteRepository.Object,
            null,
            null,
            null,
            _mockNoteOperationService.Object);
        _sut.SetCurrentUserId(TestUserId);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsNotesCrud()
    {
        _sut.CapabilityId.Should().Be("notes-crud");
    }

    [Fact]
    public void DisplayName_ReturnsNotesCrud()
    {
        _sut.DisplayName.Should().Be("Notes CRUD");
    }

    [Fact]
    public void Description_ContainsCrud()
    {
        _sut.Description.Should().Contain("Create");
        _sut.Description.Should().Contain("delete");
    }

    [Fact]
    public void GetPluginName_ReturnsNotesCrud()
    {
        _sut.GetPluginName().Should().Be("NotesCrud");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("CreateNote");
        result.Should().Contain("GetNote");
        result.Should().Contain("UpdateNote");
        result.Should().Contain("DeleteNote");
        result.Should().Contain("AppendToNote");
        result.Should().Contain("DuplicateNote");
    }

    #endregion

    #region CreateNoteAsync Tests

    [Fact]
    public async Task CreateNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.CreateNoteAsync("Title", "Content");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenTitleIsEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("", "Content");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("title is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenTitleIsWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("   ", "Content");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("title is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenContentIsEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("Title", "");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("content");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenContentIsWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("Title", "   ");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("content");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenOperationServiceIsNull_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, null);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.CreateNoteAsync("Title", "Content");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("service not available");
    }

    [Fact]
    public async Task CreateNoteAsync_WithValidInput_ReturnsSuccess()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteOperationService.Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Created(note, 1, NoteSource.Agent)));

        // Act
        var result = await _sut.CreateNoteAsync("Test Note", "Test content");

        // Assert
        result.Should().Contain("Successfully created");
        result.Should().Contain("Test Note");
        result.Should().Contain("note-1");
    }

    [Fact]
    public async Task CreateNoteAsync_WithTags_IncludesTagsInResult()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", tags: new[] { "tag1", "tag2" });
        _mockNoteOperationService.Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Created(note, 1, NoteSource.Agent)));

        // Act
        var result = await _sut.CreateNoteAsync("Test Note", "Content", "tag1, tag2");

        // Assert
        result.Should().Contain("tags");
        result.Should().Contain("tag1");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenOperationFails_ReturnsError()
    {
        // Arrange
        _mockNoteOperationService.Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(new Error("CreateFailed", "Database error")));

        // Act
        var result = await _sut.CreateNoteAsync("Test Note", "Content");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("Database error");
    }

    #endregion

    #region GetNoteAsync Tests

    [Fact]
    public async Task GetNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.GetNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task GetNoteAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.GetNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task GetNoteAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", userId: "other-user");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteAsync("note-1");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task GetNoteAsync_WithValidNote_ReturnsNoteDetails()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", content: "Note content here");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteAsync("note-1");

        // Assert
        result.Should().Contain("Test Note");
        result.Should().Contain("Note content here");
    }

    #endregion

    #region UpdateNoteAsync Tests

    [Fact]
    public async Task UpdateNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.UpdateNoteAsync("note-1", "New Title");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenOperationServiceIsNull_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, null);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.UpdateNoteAsync("note-1", "New Title");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("service not available");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.UpdateNoteAsync("note-1", "New Title");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", userId: "other-user");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.UpdateNoteAsync("note-1", "New Title");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task UpdateNoteAsync_WithValidInput_ReturnsSuccess()
    {
        // Arrange
        var note = CreateNote("note-1", "Updated Title");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        _mockNoteOperationService.Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Updated(note, 2, NoteSource.Agent, new[] { "title" })));

        // Act
        var result = await _sut.UpdateNoteAsync("note-1", "Updated Title");

        // Assert
        result.Should().Contain("Updated");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoChanges_ReturnsNoChangesMessage()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        _mockNoteOperationService.Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.NoChanges(note, NoteSource.Agent)));

        // Act
        var result = await _sut.UpdateNoteAsync("note-1", null, null, null);

        // Assert
        result.Should().Contain("No changes");
    }

    #endregion

    #region DeleteNoteAsync Tests

    [Fact]
    public async Task DeleteNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.DeleteNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenOperationServiceIsNull_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, null);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.DeleteNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("service not available");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.DeleteNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", userId: "other-user");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.DeleteNoteAsync("note-1");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task DeleteNoteAsync_WithValidNote_ReturnsSuccess()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        _mockNoteOperationService.Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(new NoteDeleteResult
            {
                Success = true,
                NoteId = "note-1",
                Source = NoteSource.Agent,
                WasSoftDelete = true
            }));

        // Act
        var result = await _sut.DeleteNoteAsync("note-1");

        // Assert
        result.Should().Contain("Successfully deleted");
    }

    #endregion

    #region AppendToNoteAsync Tests

    [Fact]
    public async Task AppendToNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.AppendToNoteAsync("note-1", "More content");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task AppendToNoteAsync_WhenContentIsEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.AppendToNoteAsync("note-1", "");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("Content to append cannot be empty");
    }

    [Fact]
    public async Task AppendToNoteAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange - AppendAsync handles note lookup internally
        _mockNoteOperationService.Setup(s => s.AppendAsync(It.IsAny<AppendToNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(Error.NotFound("Note", "note-1")));

        // Act
        var result = await _sut.AppendToNoteAsync("note-1", "More content");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task AppendToNoteAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange - AppendAsync handles permission check internally
        _mockNoteOperationService.Setup(s => s.AppendAsync(It.IsAny<AppendToNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(Error.Forbidden("You don't have permission to access this note")));

        // Act
        var result = await _sut.AppendToNoteAsync("note-1", "More content");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task AppendToNoteAsync_WithValidInput_ReturnsSuccess()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", content: "Original content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        _mockNoteOperationService.Setup(s => s.AppendAsync(It.IsAny<AppendToNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Updated(note, 2, NoteSource.Agent, new[] { "content" })));

        // Act
        var result = await _sut.AppendToNoteAsync("note-1", "Appended content");

        // Assert
        result.Should().Contain("Successfully appended");
    }

    #endregion

    #region DuplicateNoteAsync Tests

    [Fact]
    public async Task DuplicateNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteCrudPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.DuplicateNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task DuplicateNoteAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange - DuplicateAsync handles note lookup internally
        _mockNoteOperationService.Setup(s => s.DuplicateAsync(It.IsAny<DuplicateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(Error.NotFound("Note", "note-1")));

        // Act
        var result = await _sut.DuplicateNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task DuplicateNoteAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange - DuplicateAsync handles permission check internally
        _mockNoteOperationService.Setup(s => s.DuplicateAsync(It.IsAny<DuplicateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(Error.Forbidden("You don't have permission to access this note")));

        // Act
        var result = await _sut.DuplicateNoteAsync("note-1");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task DuplicateNoteAsync_WithValidNote_ReturnsSuccess()
    {
        // Arrange
        var duplicatedNote = CreateNote("note-2", "Test Note (Copy)");

        _mockNoteOperationService.Setup(s => s.DuplicateAsync(It.IsAny<DuplicateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Duplicated(duplicatedNote, 1, NoteSource.Agent, "note-1")));

        // Act
        var result = await _sut.DuplicateNoteAsync("note-1");

        // Assert
        result.Should().Contain("Successfully duplicated");
        result.Should().Contain("note-2");
    }

    [Fact]
    public async Task DuplicateNoteAsync_WithCustomTitle_UsesProvidedTitle()
    {
        // Arrange
        var duplicatedNote = CreateNote("note-2", "Custom Title");

        DuplicateNoteOperationRequest? capturedRequest = null;
        _mockNoteOperationService.Setup(s => s.DuplicateAsync(It.IsAny<DuplicateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DuplicateNoteOperationRequest, CancellationToken>((req, ct) => capturedRequest = req)
            .ReturnsAsync(Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Duplicated(duplicatedNote, 1, NoteSource.Agent, "note-1")));

        // Act
        await _sut.DuplicateNoteAsync("note-1", "Custom Title");

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.NewTitle.Should().Be("Custom Title");
    }

    #endregion

    #region Helper Methods

    private Note CreateNote(
        string id,
        string title,
        string? content = null,
        string? userId = null,
        bool isArchived = false,
        string[]? tags = null)
    {
        return new Note
        {
            Id = id,
            Title = title,
            Content = content ?? "Default content",
            UserId = userId ?? TestUserId,
            IsArchived = isArchived,
            Tags = tags?.ToList() ?? new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
