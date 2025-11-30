using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class ChatControllerTests
{
    private readonly Mock<IChatConversationService> _mockChatService;
    private readonly Mock<IChatRepository> _mockChatRepository;
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<IAIProviderFactory> _mockProviderFactory;
    private readonly Mock<IImageGenerationProviderFactory> _mockImageGenerationFactory;
    private readonly Mock<IRagService> _mockRagService;
    private readonly Mock<IUserPreferencesService> _mockUserPreferencesService;
    private readonly Mock<ILogger<ChatController>> _mockLogger;
    private readonly ChatController _sut;

    public ChatControllerTests()
    {
        _mockChatService = new Mock<IChatConversationService>();
        _mockChatRepository = new Mock<IChatRepository>();
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockProviderFactory = new Mock<IAIProviderFactory>();
        _mockImageGenerationFactory = new Mock<IImageGenerationProviderFactory>();
        _mockRagService = new Mock<IRagService>();
        _mockUserPreferencesService = new Mock<IUserPreferencesService>();
        _mockLogger = new Mock<ILogger<ChatController>>();

        _sut = new ChatController(
            _mockChatService.Object,
            _mockChatRepository.Object,
            _mockNoteRepository.Object,
            _mockProviderFactory.Object,
            _mockImageGenerationFactory.Object,
            _mockRagService.Object,
            _mockUserPreferencesService.Object,
            _mockLogger.Object
        );

        SetupUnauthenticatedUser();
    }

    #region GetConversations Tests

    [Fact]
    public async Task GetConversations_WhenAuthenticated_ReturnsOkWithConversations()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var conversations = new List<ChatConversation>
        {
            CreateTestConversation("conv-1", userId, "First Conversation"),
            CreateTestConversation("conv-2", userId, "Second Conversation")
        };
        _mockChatService.Setup(s => s.GetAllConversationsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversations);

        // Act
        var result = await _sut.GetConversations();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedConversations = okResult.Value.Should().BeAssignableTo<IEnumerable<ChatConversation>>().Subject;
        returnedConversations.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetConversations_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated (default setup)

        // Act
        var result = await _sut.GetConversations();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GetConversations_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.GetAllConversationsAsync(userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetConversations();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetConversation Tests

    [Fact]
    public async Task GetConversation_WhenConversationExists_ReturnsOkWithConversation()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        var conversation = CreateTestConversation(conversationId, userId, "Test Conversation");
        _mockChatService.Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.GetConversation(conversationId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedConversation = okResult.Value.Should().BeOfType<ChatConversation>().Subject;
        returnedConversation.Id.Should().Be(conversationId);
    }

    [Fact]
    public async Task GetConversation_WhenConversationDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.GetConversation(conversationId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetConversation_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.GetConversationByIdAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.GetConversation(conversationId);

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task GetConversation_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated

        // Act
        var result = await _sut.GetConversation("conv-1");

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region CreateConversation Tests

    [Fact]
    public async Task CreateConversation_WhenValid_ReturnsCreatedWithConversation()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateConversationRequest
        {
            Title = "New Chat",
            Provider = "openai",
            Model = "gpt-4"
        };

        var createdConversation = CreateTestConversation("created-conv-id", userId, "New Chat");
        _mockChatService.Setup(s => s.CreateConversationAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                userId,
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<bool>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdConversation);

        // Act
        var result = await _sut.CreateConversation(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.StatusCode.Should().Be(StatusCodes.Status201Created);
        createdResult.ActionName.Should().Be("GetConversation");
        createdResult.RouteValues!["id"].Should().Be("created-conv-id");
    }

    [Fact]
    public async Task CreateConversation_WhenProviderMissing_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateConversationRequest
        {
            Title = "New Chat",
            Provider = "",
            Model = "gpt-4"
        };

        // Act
        var result = await _sut.CreateConversation(request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Provider is required" });
    }

    [Fact]
    public async Task CreateConversation_WhenModelMissing_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateConversationRequest
        {
            Title = "New Chat",
            Provider = "openai",
            Model = ""
        };

        // Act
        var result = await _sut.CreateConversation(request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Model is required" });
    }

    [Fact]
    public async Task CreateConversation_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        var request = new CreateConversationRequest
        {
            Title = "New Chat",
            Provider = "openai",
            Model = "gpt-4"
        };

        // Act
        var result = await _sut.CreateConversation(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task CreateConversation_PassesAllParametersToService()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateConversationRequest
        {
            Title = "Custom Chat",
            Provider = "claude",
            Model = "claude-3-opus",
            RagEnabled = true,
            AgentEnabled = true,
            ImageGenerationEnabled = true,
            AgentCapabilities = "notes",
            VectorStoreProvider = "pinecone"
        };

        _mockChatService.Setup(s => s.CreateConversationAsync(
                "Custom Chat",
                "claude",
                "claude-3-opus",
                userId,
                true,
                true,
                true,
                "notes",
                "pinecone",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestConversation("id", userId, "Custom Chat"));

        // Act
        await _sut.CreateConversation(request);

        // Assert
        _mockChatService.Verify(s => s.CreateConversationAsync(
            "Custom Chat",
            "claude",
            "claude-3-opus",
            userId,
            true,
            true,
            true,
            "notes",
            "pinecone",
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region UpdateConversationSettings Tests

    [Fact]
    public async Task UpdateConversationSettings_WhenValid_ReturnsOkWithUpdatedConversation()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        var request = new UpdateConversationSettingsRequest
        {
            RagEnabled = true,
            VectorStoreProvider = "postgresql"
        };

        var updatedConversation = CreateTestConversation(conversationId, userId, "Test");
        updatedConversation.RagEnabled = true;
        updatedConversation.VectorStoreProvider = "postgresql";

        _mockChatService.Setup(s => s.UpdateConversationSettingsAsync(
                conversationId,
                userId,
                true,
                "postgresql",
                null,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(updatedConversation);

        // Act
        var result = await _sut.UpdateConversationSettings(conversationId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedConversation = okResult.Value.Should().BeOfType<ChatConversation>().Subject;
        returnedConversation.RagEnabled.Should().BeTrue();
        returnedConversation.VectorStoreProvider.Should().Be("postgresql");
    }

    [Fact]
    public async Task UpdateConversationSettings_WhenConversationDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.UpdateConversationSettingsAsync(
                conversationId,
                userId,
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.UpdateConversationSettings(conversationId, new UpdateConversationSettingsRequest());

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpdateConversationSettings_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.UpdateConversationSettingsAsync(
                conversationId,
                userId,
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.UpdateConversationSettings(conversationId, new UpdateConversationSettingsRequest());

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    #endregion

    #region DeleteConversation Tests

    [Fact]
    public async Task DeleteConversation_WhenSuccessful_ReturnsNoContent()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteConversation(conversationId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteConversation_WhenConversationDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteConversation(conversationId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteConversation_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var conversationId = "conv-1";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.DeleteConversationAsync(conversationId, userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.DeleteConversation(conversationId);

        // Assert
        var forbiddenResult = result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task DeleteConversation_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated

        // Act
        var result = await _sut.DeleteConversation("conv-1");

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
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

    private static ChatConversation CreateTestConversation(string id, string userId, string title)
    {
        return new ChatConversation
        {
            Id = id,
            UserId = userId,
            Title = title,
            Provider = "openai",
            Model = "gpt-4",
            RagEnabled = false,
            AgentEnabled = false,
            ImageGenerationEnabled = false,
            Messages = new List<ChatMessage>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

