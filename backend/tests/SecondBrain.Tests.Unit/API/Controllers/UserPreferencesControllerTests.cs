using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class UserPreferencesControllerTests
{
    private readonly Mock<IUserPreferencesService> _mockPreferencesService;
    private readonly Mock<ILogger<UserPreferencesController>> _mockLogger;
    private readonly UserPreferencesController _sut;

    public UserPreferencesControllerTests()
    {
        _mockPreferencesService = new Mock<IUserPreferencesService>();
        _mockLogger = new Mock<ILogger<UserPreferencesController>>();
        _sut = new UserPreferencesController(
            _mockPreferencesService.Object,
            _mockLogger.Object
        );
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

        _mockPreferencesService.Setup(s => s.GetPreferencesAsync(userId))
            .ReturnsAsync(preferences);

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
    public async Task GetPreferences_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        _mockPreferencesService.Setup(s => s.GetPreferencesAsync(userId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetPreferences(userId);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetPreferences_CallsServiceWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        _mockPreferencesService.Setup(s => s.GetPreferencesAsync(userId))
            .ReturnsAsync(new UserPreferencesResponse());

        // Act
        await _sut.GetPreferences(userId);

        // Assert
        _mockPreferencesService.Verify(s => s.GetPreferencesAsync(userId), Times.Once);
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

        _mockPreferencesService.Setup(s => s.GetPreferencesAsync(userId))
            .ReturnsAsync(preferences);

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

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedPreferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        returnedPreferences.ChatProvider.Should().Be("openai");
        returnedPreferences.ChatModel.Should().Be("gpt-4-turbo");
    }

    [Fact]
    public async Task UpdatePreferences_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { ChatProvider = "openai" };

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ThrowsAsync(new Exception("Update failed"));

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task UpdatePreferences_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = "anthropic",
            ChatModel = "claude-3-opus",
            DefaultNoteView = "grid"
        };

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(new UserPreferencesResponse());

        // Act
        await _sut.UpdatePreferences(userId, request);

        // Assert
        _mockPreferencesService.Verify(s => s.UpdatePreferencesAsync(
            userId,
            It.Is<UpdateUserPreferencesRequest>(r =>
                r.ChatProvider == "anthropic" &&
                r.ChatModel == "claude-3-opus" &&
                r.DefaultNoteView == "grid"
            )), Times.Once);
    }

    [Fact]
    public async Task UpdatePreferences_CanUpdateItemsPerPage()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest { ItemsPerPage = 50 };

        var updatedPreferences = new UserPreferencesResponse { ItemsPerPage = 50 };

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

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

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

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

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

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

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

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

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(updatedPreferences);

        // Act
        var result = await _sut.UpdatePreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var preferences = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;
        preferences.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task UpdatePreferences_WithEmptyRequest_StillCallsService()
    {
        // Arrange
        var userId = "user-123";
        var request = new UpdateUserPreferencesRequest();

        _mockPreferencesService.Setup(s => s.UpdatePreferencesAsync(userId, request))
            .ReturnsAsync(new UserPreferencesResponse());

        // Act
        await _sut.UpdatePreferences(userId, request);

        // Assert
        _mockPreferencesService.Verify(s => s.UpdatePreferencesAsync(userId, request), Times.Once);
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

