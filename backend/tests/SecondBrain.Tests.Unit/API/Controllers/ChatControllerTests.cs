using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
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

    #region SendMessage Tests

    [Fact]
    public async Task SendMessage_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated
        var request = new SendMessageRequest { Content = "Test message" };

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task SendMessage_WhenContentIsEmpty_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "" };

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Message content is required" });
    }

    [Fact]
    public async Task SendMessage_WhenContentIsWhitespace_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "   " };

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SendMessage_WhenConversationNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        _mockChatRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.SendMessage("non-existent", request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task SendMessage_WhenConversationBelongsToOtherUser_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", "other-user", "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    #endregion

    #region GetImageGenerationProviders Tests

    [Fact]
    public void GetImageGenerationProviders_WhenNoProviders_ReturnsEmptyList()
    {
        // Arrange
        _mockImageGenerationFactory.Setup(f => f.GetEnabledProviders())
            .Returns(Array.Empty<IImageGenerationProvider>());

        // Act
        var result = _sut.GetImageGenerationProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().NotBeNull();
    }

    #endregion

    #region GetImageGenerationSizes Tests

    [Fact]
    public void GetImageGenerationSizes_WhenProviderNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockImageGenerationFactory.Setup(f => f.HasProvider("non-existent"))
            .Returns(false);

        // Act
        var result = _sut.GetImageGenerationSizes("non-existent");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GenerateImage Tests

    [Fact]
    public async Task GenerateImage_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated
        var request = new GenerateImageRequest { Prompt = "Test prompt", Provider = "openai" };

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GenerateImage_WhenPromptIsEmpty_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest { Prompt = "", Provider = "openai" };

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Prompt is required" });
    }

    [Fact]
    public async Task GenerateImage_WhenProviderIsEmpty_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest { Prompt = "Test prompt", Provider = "" };

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Provider is required" });
    }

    [Fact]
    public async Task GenerateImage_WhenConversationNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest { Prompt = "Test prompt", Provider = "openai" };

        _mockChatRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.GenerateImage("non-existent", request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GenerateImage_WhenConversationBelongsToOtherUser_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest { Prompt = "Test prompt", Provider = "openai" };

        var conversation = CreateTestConversation("conv-1", "other-user", "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task GenerateImage_WhenProviderNotFound_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest { Prompt = "Test prompt", Provider = "unknown" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockImageGenerationFactory.Setup(f => f.HasProvider("unknown"))
            .Returns(false);

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region GenerateSuggestedPrompts Tests

    [Fact]
    public async Task GenerateSuggestedPrompts_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated
        var request = new GenerateSuggestedPromptsRequest { Provider = "OpenAI", Model = "gpt-4o-mini" };

        // Act
        var result = await _sut.GenerateSuggestedPrompts(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GenerateSuggestedPrompts_WhenNoNotes_ReturnsDefaultPrompts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateSuggestedPromptsRequest();

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.GenerateSuggestedPrompts(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuggestedPromptsResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Prompts.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateSuggestedPrompts_WhenOnlyArchivedNotes_ReturnsDefaultPrompts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateSuggestedPromptsRequest();

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>
            {
                new() { Id = "1", Title = "Archived Note", Content = "Test", IsArchived = true, UserId = userId }
            });

        // Act
        var result = await _sut.GenerateSuggestedPrompts(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuggestedPromptsResponse>().Subject;
        response.Success.Should().BeTrue();
    }

    #endregion

    #region StreamMessage Tests

    [Fact]
    public async Task StreamMessage_WhenNotAuthenticated_Returns401()
    {
        // Arrange
        SetupStreamingContext();
        var request = new SendMessageRequest { Content = "Test message" };

        // Act
        await _sut.StreamMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task StreamMessage_WhenContentIsEmpty_Returns400()
    {
        // Arrange
        SetupAuthenticatedStreamingContext("user-123");
        var request = new SendMessageRequest { Content = "" };

        // Act
        await _sut.StreamMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task StreamMessage_WhenConversationNotFound_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        _mockChatRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        await _sut.StreamMessage("non-existent", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("error");
        responseBody.Should().Contain("Conversation not found");
    }

    [Fact]
    public async Task StreamMessage_WhenConversationBelongsToOtherUser_WritesAccessDeniedError()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", "other-user", "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        // Act
        await _sut.StreamMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("Access denied");
    }

    #endregion

    #region GetImageGenerationProviders Tests

    [Fact]
    public void GetImageGenerationProviders_WhenProvidersExist_ReturnsProviderList()
    {
        // Arrange
        var mockProvider = new Mock<IImageGenerationProvider>();
        mockProvider.Setup(p => p.ProviderName).Returns("OpenAI");
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GetSupportedModels()).Returns(new[] { "dall-e-3", "dall-e-2" });

        _mockImageGenerationFactory.Setup(f => f.GetEnabledProviders())
            .Returns(new[] { mockProvider.Object });

        // Act
        var result = _sut.GetImageGenerationProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providers = okResult.Value.Should().BeAssignableTo<IEnumerable<ImageProviderInfo>>().Subject;
        providers.Should().HaveCount(1);
        providers.First().Provider.Should().Be("OpenAI");
    }

    #endregion

    #region GetImageGenerationSizes Tests

    [Fact]
    public void GetImageGenerationSizes_WhenProviderExists_ReturnsSizes()
    {
        // Arrange
        var mockProvider = new Mock<IImageGenerationProvider>();
        mockProvider.Setup(p => p.GetSupportedSizes(It.IsAny<string>()))
            .Returns(new[] { "1024x1024", "512x512" });

        _mockImageGenerationFactory.Setup(f => f.HasProvider("openai"))
            .Returns(true);
        _mockImageGenerationFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        var result = _sut.GetImageGenerationSizes("openai");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var sizes = okResult.Value.Should().BeAssignableTo<IEnumerable<string>>().Subject;
        sizes.Should().Contain("1024x1024");
    }

    #endregion

    #region CreateConversation Error Handling Tests

    [Fact]
    public async Task CreateConversation_WhenServiceThrows_Returns500()
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
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.CreateConversation(request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetConversation Error Handling Tests

    [Fact]
    public async Task GetConversation_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.GetConversationByIdAsync("conv-1", userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetConversation("conv-1");

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region UpdateConversationSettings Error Handling Tests

    [Fact]
    public async Task UpdateConversationSettings_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - user not authenticated
        var request = new UpdateConversationSettingsRequest { RagEnabled = true };

        // Act
        var result = await _sut.UpdateConversationSettings("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task UpdateConversationSettings_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.UpdateConversationSettingsAsync(
                "conv-1",
                userId,
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.UpdateConversationSettings("conv-1", new UpdateConversationSettingsRequest());

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region DeleteConversation Error Handling Tests

    [Fact]
    public async Task DeleteConversation_WhenServiceThrows_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        _mockChatService.Setup(s => s.DeleteConversationAsync("conv-1", userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.DeleteConversation("conv-1");

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region SendMessage Success Scenarios

    [Fact]
    public async Task SendMessage_WhenSuccessful_ReturnsOkWithChatResponse()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Hello, AI!" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<SecondBrain.Application.Services.AI.Models.ChatMessage>>(),
                It.IsAny<SecondBrain.Application.Services.AI.Models.AIRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SecondBrain.Application.Services.AI.Models.AIResponse
            {
                Success = true,
                Content = "Hello! How can I help you?",
                TokensUsed = 25
            });

        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        _mockChatRepository.Setup(r => r.UpdateAsync("conv-1", It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task SendMessage_WhenProviderNotEnabled_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Hello!" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Provider 'openai' is not enabled" });
    }

    [Fact]
    public async Task SendMessage_WhenInvalidProvider_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Hello!" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Throws(new ArgumentException("Unknown provider"));

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SendMessage_WhenUpdateFails_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new SendMessageRequest { Content = "Hello!" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<SecondBrain.Application.Services.AI.Models.ChatMessage>>(),
                It.IsAny<SecondBrain.Application.Services.AI.Models.AIRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SecondBrain.Application.Services.AI.Models.AIResponse
            {
                Success = true,
                Content = "Response"
            });

        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        _mockChatRepository.Setup(r => r.UpdateAsync("conv-1", It.IsAny<ChatConversation>()))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        var result = await _sut.SendMessage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GenerateImage Success Scenarios

    [Fact]
    public async Task GenerateImage_WhenSuccessful_ReturnsOkWithImages()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest
        {
            Prompt = "A beautiful sunset",
            Provider = "openai",
            Model = "dall-e-3"
        };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IImageGenerationProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateImageAsync(
                It.IsAny<SecondBrain.Application.Services.AI.Models.ImageGenerationRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SecondBrain.Application.Services.AI.Models.ImageGenerationResponse
            {
                Success = true,
                Images = new List<SecondBrain.Application.Services.AI.Models.GeneratedImage>
                {
                    new() { Base64Data = "base64data", MediaType = "image/png", Width = 1024, Height = 1024 }
                },
                Model = "dall-e-3",
                Provider = "OpenAI"
            });

        _mockImageGenerationFactory.Setup(f => f.HasProvider("openai"))
            .Returns(true);
        _mockImageGenerationFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        _mockChatRepository.Setup(r => r.UpdateAsync("conv-1", It.IsAny<ChatConversation>()))
            .ReturnsAsync((string id, ChatConversation c) => c);

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ImageGenerationApiResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Images.Should().HaveCount(1);
    }

    [Fact]
    public async Task GenerateImage_WhenProviderNotEnabled_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest
        {
            Prompt = "Test",
            Provider = "openai"
        };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IImageGenerationProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(false);

        _mockImageGenerationFactory.Setup(f => f.HasProvider("openai"))
            .Returns(true);
        _mockImageGenerationFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateImage_WhenGenerationFails_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest
        {
            Prompt = "Test",
            Provider = "openai"
        };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IImageGenerationProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(true);
        mockProvider.Setup(p => p.GenerateImageAsync(
                It.IsAny<SecondBrain.Application.Services.AI.Models.ImageGenerationRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SecondBrain.Application.Services.AI.Models.ImageGenerationResponse
            {
                Success = false,
                Error = "Generation failed"
            });

        _mockImageGenerationFactory.Setup(f => f.HasProvider("openai"))
            .Returns(true);
        _mockImageGenerationFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateImage_WhenExceptionThrown_Returns500()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateImageRequest
        {
            Prompt = "Test",
            Provider = "openai"
        };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockImageGenerationFactory.Setup(f => f.HasProvider("openai"))
            .Returns(true);
        _mockImageGenerationFactory.Setup(f => f.GetProvider("openai"))
            .Throws(new Exception("Provider error"));

        // Act
        var result = await _sut.GenerateImage("conv-1", request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region StreamMessage Success Scenarios

    [Fact]
    public async Task StreamMessage_WhenProviderNotEnabled_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(mockProvider.Object);

        // Act
        await _sut.StreamMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("Provider not enabled");
    }

    [Fact]
    public async Task StreamMessage_WhenExceptionThrown_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new SendMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Throws(new Exception("Provider error"));

        // Act
        await _sut.StreamMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("error");
    }

    #endregion

    #region GenerateSuggestedPrompts Additional Tests

    [Fact]
    public async Task GenerateSuggestedPrompts_WhenExceptionThrown_ReturnsDefaultPrompts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateSuggestedPromptsRequest();

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GenerateSuggestedPrompts(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuggestedPromptsResponse>().Subject;
        response.Success.Should().BeFalse();
        response.Prompts.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GenerateSuggestedPrompts_WhenProviderNotEnabled_ReturnsDefaultPrompts()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);
        var request = new GenerateSuggestedPromptsRequest { Provider = "disabled-provider" };

        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>
            {
                new() { Id = "1", Title = "Test", Content = "Content", IsArchived = false, UserId = userId }
            });

        var mockProvider = new Mock<IAIProvider>();
        mockProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("disabled-provider"))
            .Returns(mockProvider.Object);

        // Act
        var result = await _sut.GenerateSuggestedPrompts(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuggestedPromptsResponse>().Subject;
        response.Prompts.Should().NotBeEmpty();
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

    private void SetupStreamingContext()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupAuthenticatedStreamingContext(string userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = userId;
        httpContext.Response.Body = new MemoryStream();
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

