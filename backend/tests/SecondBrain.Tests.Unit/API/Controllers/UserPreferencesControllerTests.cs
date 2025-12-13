using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.UserPreferences.UpdatePreferences;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.UserPreferences.GetPreferences;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class UserPreferencesControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly UserPreferencesController _sut;

    public UserPreferencesControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _sut = new UserPreferencesController(_mockMediator.Object);
    }

    #region GetPreferences Tests

    [Fact]
    public async Task GetPreferences_WhenUserExists_ReturnsOkWithPreferences()
    {
        // Arrange
        var userId = "user-123";
        var preferences = new UserPreferencesResponse
        {
            ChatProvider = "openai",
            ChatModel = "gpt-4",
            VectorStoreProvider = "PostgreSQL",
            DefaultNoteView = "list",
            ItemsPerPage = 20,
            FontSize = "medium",
            EnableNotifications = true,
            OllamaRemoteUrl = null,
            UseRemoteOllama = false
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetPreferencesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(preferences));

        // Act
        var result = await _sut.GetPreferences(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPreferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        returnedPreferences.ChatProvider.Should().Be("openai");
        returnedPreferences.ChatModel.Should().Be("gpt-4");
        returnedPreferences.DefaultNoteView.Should().Be("list");
        returnedPreferences.ItemsPerPage.Should().Be(20);
    }

    [Fact]
    public async Task GetPreferences_WhenServiceFails_Returns500()
    {
        // Arrange
        var userId = "user-123";
        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetPreferencesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Failure(Error.Internal("Database error")));

        // Act
        var result = await _sut.GetPreferences(userId);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetPreferences_CallsMediatorWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        GetPreferencesQuery? capturedQuery = null;

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetPreferencesQuery>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<UserPreferencesResponse>>, CancellationToken>((q, _) => capturedQuery = (GetPreferencesQuery)q)
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(new UserPreferencesResponse()));

        // Act
        await _sut.GetPreferences(userId);

        // Assert
        capturedQuery.Should().NotBeNull();
        capturedQuery!.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task GetPreferences_ReturnsAllPreferencesFields()
    {
        // Arrange
        var userId = "user-123";
        var preferences = new UserPreferencesResponse
        {
            ChatProvider = "anthropic",
            ChatModel = "claude-3-opus",
            VectorStoreProvider = "Pinecone",
            DefaultNoteView = "grid",
            ItemsPerPage = 50,
            FontSize = "large",
            EnableNotifications = false,
            OllamaRemoteUrl = "http://192.168.1.100:11434",
            UseRemoteOllama = true
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetPreferencesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(preferences));

        // Act
        var result = await _sut.GetPreferences(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPreferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        returnedPreferences.VectorStoreProvider.Should().Be("Pinecone");
        returnedPreferences.FontSize.Should().Be("large");
        returnedPreferences.EnableNotifications.Should().BeFalse();
        returnedPreferences.OllamaRemoteUrl.Should().Be("http://192.168.1.100:11434");
        returnedPreferences.UseRemoteOllama.Should().BeTrue();
    }

    #endregion

    #region UpdatePreferences Tests

    [Fact]
    public async Task UpdatePreferences_WhenValid_ReturnsOkWithUpdatedPreferences()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = "openai",
            ChatModel = "gpt-4-turbo"
        };

        var updatedPreferences = new UserPreferencesResponse
        {
            ChatProvider = "openai",
            ChatModel = "gpt-4-turbo",
            VectorStoreProvider = "PostgreSQL",
            DefaultNoteView = "list",
            ItemsPerPage = 20,
            FontSize = "medium",
            EnableNotifications = true
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPreferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        returnedPreferences.ChatProvider.Should().Be("openai");
        returnedPreferences.ChatModel.Should().Be("gpt-4-turbo");
    }

    [Fact]
    public async Task UpdatePreferences_WhenServiceFails_Returns500()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { ChatProvider = "openai" };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Failure(Error.Internal("Update failed")));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UpdatePreferences_CallsMediatorWithCorrectParameters()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = "anthropic",
            ChatModel = "claude-3-opus",
            DefaultNoteView = "grid"
        };

        UpdatePreferencesCommand? capturedCommand = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<UserPreferencesResponse>>, CancellationToken>((cmd, _) => capturedCommand = (UpdatePreferencesCommand)cmd)
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(new UserPreferencesResponse()));

        // Act
        await _sut.UpdatePreferences(userId, request);

        // Assert
        capturedCommand.Should().NotBeNull();
        capturedCommand!.UserId.Should().Be(userId);
        capturedCommand.Request.ChatProvider.Should().Be("anthropic");
        capturedCommand.Request.ChatModel.Should().Be("claude-3-opus");
        capturedCommand.Request.DefaultNoteView.Should().Be("grid");
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateItemsPerPage()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { ItemsPerPage = 50 };

        var updatedPreferences = new UserPreferencesResponse { ItemsPerPage = 50 };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.ItemsPerPage.Should().Be(50);
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateFontSize()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { FontSize = "large" };

        var updatedPreferences = new UserPreferencesResponse { FontSize = "large" };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.FontSize.Should().Be("large");
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateNotifications()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { EnableNotifications = false };

        var updatedPreferences = new UserPreferencesResponse { EnableNotifications = false };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.EnableNotifications.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateOllamaSettings()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest
        {
            OllamaRemoteUrl = "http://192.168.1.100:11434",
            UseRemoteOllama = true
        };

        var updatedPreferences = new UserPreferencesResponse
        {
            OllamaRemoteUrl = "http://192.168.1.100:11434",
            UseRemoteOllama = true
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.OllamaRemoteUrl.Should().Be("http://192.168.1.100:11434");
        preferences.UseRemoteOllama.Should().BeTrue();
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateVectorStoreProvider()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { VectorStoreProvider = "Pinecone" };

        var updatedPreferences = new UserPreferencesResponse { VectorStoreProvider = "Pinecone" };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(updatedPreferences));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task UpdatePreferences_WithEmptyRequest_StillCallsMediator()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest();

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdatePreferencesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<UserPreferencesResponse>.Success(new UserPreferencesResponse()));

        // Act
        await _sut.UpdatePreferences(userId, request);

        // Assert
        _mockMediator.Verify(
            m => m.Send(It.Is<UpdatePreferencesCommand>(c => c.UserId == userId), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region Request Model Tests

    [Fact]
    public void UpdateUserPreferencesRequest_AllPropertiesNullable()
    {
        // Arrange & Act
        var request = new UpdateUserPreferencesRequest();

        // Assert
        request.ChatProvider.Should().BeNull();
        request.ChatModel.Should().BeNull();
        request.VectorStoreProvider.Should().BeNull();
        request.DefaultNoteView.Should().BeNull();
        request.ItemsPerPage.Should().BeNull();
        request.FontSize.Should().BeNull();
        request.EnableNotifications.Should().BeNull();
        request.OllamaRemoteUrl.Should().BeNull();
        request.UseRemoteOllama.Should().BeNull();
    }

    [Fact]
    public void UpdateUserPreferencesRequest_CanSetAllProperties()
    {
        // Arrange & Act
        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = "openai",
            ChatModel = "gpt-4",
            VectorStoreProvider = "PostgreSQL",
            DefaultNoteView = "list",
            ItemsPerPage = 25,
            FontSize = "medium",
            EnableNotifications = true,
            OllamaRemoteUrl = "http://localhost:11434",
            UseRemoteOllama = false
        };

        // Assert
        request.ChatProvider.Should().Be("openai");
        request.ChatModel.Should().Be("gpt-4");
        request.VectorStoreProvider.Should().Be("PostgreSQL");
        request.DefaultNoteView.Should().Be("list");
        request.ItemsPerPage.Should().Be(25);
        request.FontSize.Should().Be("medium");
        request.EnableNotifications.Should().BeTrue();
        request.OllamaRemoteUrl.Should().Be("http://localhost:11434");
        request.UseRemoteOllama.Should().BeFalse();
    }

    #endregion

    #region Response Model Tests

    [Fact]
    public void UserPreferencesResponse_HasCorrectDefaultValues()
    {
        // Arrange & Act
        var response = new UserPreferencesResponse();

        // Assert
        response.ChatProvider.Should().BeNull();
        response.ChatModel.Should().BeNull();
        response.VectorStoreProvider.Should().Be("PostgreSQL");
        response.DefaultNoteView.Should().Be("list");
        response.ItemsPerPage.Should().Be(20);
        response.FontSize.Should().Be("medium");
        response.EnableNotifications.Should().BeTrue();
        response.OllamaRemoteUrl.Should().BeNull();
        response.UseRemoteOllama.Should().BeFalse();
    }

    #endregion
}
