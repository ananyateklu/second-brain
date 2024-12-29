using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using FluentAssertions;

namespace SecondBrain.Tests.Services;

public class ActivityLoggerTests
{
    private readonly ActivityLogger _activityLogger;
    private readonly Mock<ILogger<ActivityLogger>> _loggerMock;
    private readonly DataContext _context;

    public ActivityLoggerTests()
    {
        // Setup logger
        _loggerMock = new Mock<ILogger<ActivityLogger>>();

        // Setup in-memory database
        var options = new DbContextOptionsBuilder<DataContext>()
            .UseInMemoryDatabase(databaseName: "TestDb")
            .Options;
        _context = new DataContext(options);

        _activityLogger = new ActivityLogger(_context, _loggerMock.Object);
    }

    [Fact]
    public async Task LogActivity_ValidActivity_LogsSuccessfully()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "CREATE";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";

        // Act
        await _activityLogger.LogActivityAsync(
            userId,
            actionType,
            itemType,
            itemId,
            itemTitle,
            description);

        // Assert
        var activity = await _context.Activities.FirstOrDefaultAsync();
        activity.Should().NotBeNull();
        activity!.UserId.Should().Be(userId);
        activity.ActionType.Should().Be(actionType);
        activity.ItemType.Should().Be(itemType);
        activity.ItemId.Should().Be(itemId);
        activity.ItemTitle.Should().Be(itemTitle);
        activity.Description.Should().Be(description);
    }

    [Fact]
    public async Task LogActivity_NullUserId_ThrowsArgumentException()
    {
        // Arrange
        string? userId = null;
        var actionType = "CREATE";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _activityLogger.LogActivityAsync(
                userId!,
                actionType,
                itemType,
                itemId,
                itemTitle,
                description));
    }

    [Fact]
    public async Task LogActivity_EmptyActionType_ThrowsArgumentException()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _activityLogger.LogActivityAsync(
                userId,
                actionType,
                itemType,
                itemId,
                itemTitle,
                description));
    }

    [Fact]
    public async Task LogActivity_WithMetadata_LogsSuccessfully()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "CREATE";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";
        var metadata = new { tags = new[] { "test", "important" }, priority = 1 };

        // Act
        await _activityLogger.LogActivityAsync(
            userId,
            actionType,
            itemType,
            itemId,
            itemTitle,
            description,
            metadata);

        // Assert
        var activity = await _context.Activities.FirstOrDefaultAsync();
        activity.Should().NotBeNull();
        activity!.MetadataJson.Should().NotBeNull();
        activity.MetadataJson.Should().Contain("tags");
        activity.MetadataJson.Should().Contain("priority");
    }

    [Fact]
    public async Task LogActivity_EmptyDescription_ThrowsArgumentException()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "CREATE";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _activityLogger.LogActivityAsync(
                userId,
                actionType,
                itemType,
                itemId,
                itemTitle,
                description));
    }

    [Fact]
    public async Task LogActivity_EmptyItemType_ThrowsArgumentException()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "CREATE";
        var itemType = "";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _activityLogger.LogActivityAsync(
                userId,
                actionType,
                itemType,
                itemId,
                itemTitle,
                description));
    }

    [Fact]
    public async Task LogActivity_DatabaseError_LogsErrorAndDoesNotThrow()
    {
        // Arrange
        var userId = "test-user-id";
        var actionType = "CREATE";
        var itemType = "NOTE";
        var itemId = "test-note-id";
        var itemTitle = "Test Note";
        var description = "Created a new note";

        // Force a database error by disposing the context
        await _context.DisposeAsync();

        // Act & Assert
        // Should not throw despite database error
        await _activityLogger.LogActivityAsync(
            userId,
            actionType,
            itemType,
            itemId,
            itemTitle,
            description);

        // Verify that error was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }
}