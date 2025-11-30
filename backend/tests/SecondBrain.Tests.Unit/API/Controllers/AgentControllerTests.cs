using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using UserPreferencesResponse = SecondBrain.Application.DTOs.Responses.UserPreferencesResponse;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.API.Controllers;

public static class AsyncEnumerable
{
    public static async IAsyncEnumerable<T> Empty<T>()
    {
        await Task.CompletedTask;
        yield break;
    }
}

public class AgentControllerTests
{
    private readonly Mock<IAgentService> _mockAgentService;
    private readonly Mock<IChatRepository> _mockChatRepository;
    private readonly Mock<IUserPreferencesService> _mockUserPreferencesService;
    private readonly Mock<ILogger<AgentController>> _mockLogger;
    private readonly AgentController _sut;

    public AgentControllerTests()
    {
        _mockAgentService = new Mock<IAgentService>();
        _mockChatRepository = new Mock<IChatRepository>();
        _mockUserPreferencesService = new Mock<IUserPreferencesService>();
        _mockLogger = new Mock<ILogger<AgentController>>();

        _sut = new AgentController(
            _mockAgentService.Object,
            _mockChatRepository.Object,
            _mockUserPreferencesService.Object,
            _mockLogger.Object
        );

        SetupUnauthenticatedUser();
    }

    #region GetSupportedProviders Tests

    [Fact]
    public void GetSupportedProviders_ReturnsAllProviders()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        response.Providers.Should().HaveCount(5);
    }

    [Fact]
    public void GetSupportedProviders_ContainsOpenAI()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        var openAi = response.Providers.FirstOrDefault(p => p.Name == "OpenAI");
        openAi.Should().NotBeNull();
        openAi!.Supported.Should().BeTrue();
        openAi.Reason.Should().Contain("function calling");
    }

    [Fact]
    public void GetSupportedProviders_ContainsClaude()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        var claude = response.Providers.FirstOrDefault(p => p.Name == "Claude");
        claude.Should().NotBeNull();
        claude!.Supported.Should().BeTrue();
    }

    [Fact]
    public void GetSupportedProviders_ContainsGemini()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        var gemini = response.Providers.FirstOrDefault(p => p.Name == "Gemini");
        gemini.Should().NotBeNull();
        gemini!.Supported.Should().BeTrue();
    }

    [Fact]
    public void GetSupportedProviders_ContainsGrok()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        var grok = response.Providers.FirstOrDefault(p => p.Name == "Grok");
        grok.Should().NotBeNull();
        grok!.Supported.Should().BeTrue();
    }

    [Fact]
    public void GetSupportedProviders_ContainsOllama()
    {
        // Act
        var result = _sut.GetSupportedProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SupportedProvidersResponse>().Subject;

        var ollama = response.Providers.FirstOrDefault(p => p.Name == "Ollama");
        ollama.Should().NotBeNull();
        ollama!.Supported.Should().BeTrue();
        ollama.Reason.Should().Contain("model dependent");
    }

    #endregion

    #region GetCapabilities Tests

    [Fact]
    public void GetCapabilities_ReturnsCapabilitiesFromService()
    {
        // Arrange
        var capabilities = new List<AgentCapability>
        {
            new()
            {
                Id = "notes",
                DisplayName = "Notes Management",
                Description = "Create, read, update, and delete notes"
            },
            new()
            {
                Id = "search",
                DisplayName = "Search",
                Description = "Search through notes and documents"
            }
        };
        _mockAgentService.Setup(s => s.GetAvailableCapabilities()).Returns(capabilities);

        // Act
        var result = _sut.GetCapabilities();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CapabilitiesResponse>().Subject;

        response.Capabilities.Should().HaveCount(2);
        response.Capabilities[0].Id.Should().Be("notes");
        response.Capabilities[0].DisplayName.Should().Be("Notes Management");
        response.Capabilities[1].Id.Should().Be("search");
    }

    [Fact]
    public void GetCapabilities_WhenNoCapabilities_ReturnsEmptyList()
    {
        // Arrange
        _mockAgentService.Setup(s => s.GetAvailableCapabilities()).Returns(new List<AgentCapability>());

        // Act
        var result = _sut.GetCapabilities();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CapabilitiesResponse>().Subject;

        response.Capabilities.Should().BeEmpty();
    }

    [Fact]
    public void GetCapabilities_IncludesAllCapabilityProperties()
    {
        // Arrange
        var capability = new AgentCapability
        {
            Id = "test-capability",
            DisplayName = "Test Capability",
            Description = "A test capability for unit testing"
        };
        _mockAgentService.Setup(s => s.GetAvailableCapabilities())
            .Returns(new List<AgentCapability> { capability });

        // Act
        var result = _sut.GetCapabilities();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CapabilitiesResponse>().Subject;

        var returnedCapability = response.Capabilities.First();
        returnedCapability.Id.Should().Be("test-capability");
        returnedCapability.DisplayName.Should().Be("Test Capability");
        returnedCapability.Description.Should().Be("A test capability for unit testing");
    }

    #endregion

    #region AgentMessageRequest DTO Tests

    [Fact]
    public void AgentMessageRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new AgentMessageRequest();

        // Assert
        request.Content.Should().Be(string.Empty);
        request.Temperature.Should().BeNull();
        request.MaxTokens.Should().BeNull();
        request.Capabilities.Should().BeNull();
    }

    [Fact]
    public void AgentMessageRequest_CanSetAllProperties()
    {
        // Arrange & Act
        var request = new AgentMessageRequest
        {
            Content = "Test message",
            Temperature = 0.7f,
            MaxTokens = 1000,
            Capabilities = new List<string> { "notes", "search" }
        };

        // Assert
        request.Content.Should().Be("Test message");
        request.Temperature.Should().Be(0.7f);
        request.MaxTokens.Should().Be(1000);
        request.Capabilities.Should().HaveCount(2);
        request.Capabilities.Should().Contain("notes");
        request.Capabilities.Should().Contain("search");
    }

    #endregion

    #region ProviderSupport DTO Tests

    [Fact]
    public void ProviderSupport_DefaultValues_AreCorrect()
    {
        // Act
        var support = new ProviderSupport();

        // Assert
        support.Name.Should().Be(string.Empty);
        support.Supported.Should().BeFalse();
        support.Reason.Should().Be(string.Empty);
    }

    [Fact]
    public void ProviderSupport_CanSetAllProperties()
    {
        // Arrange & Act
        var support = new ProviderSupport
        {
            Name = "TestProvider",
            Supported = true,
            Reason = "Full support"
        };

        // Assert
        support.Name.Should().Be("TestProvider");
        support.Supported.Should().BeTrue();
        support.Reason.Should().Be("Full support");
    }

    #endregion

    #region CapabilityInfo DTO Tests

    [Fact]
    public void CapabilityInfo_DefaultValues_AreCorrect()
    {
        // Act
        var info = new CapabilityInfo();

        // Assert
        info.Id.Should().Be(string.Empty);
        info.DisplayName.Should().Be(string.Empty);
        info.Description.Should().Be(string.Empty);
    }

    #endregion

    #region StreamAgentMessage Tests

    [Fact]
    public async Task StreamAgentMessage_WhenNotAuthenticated_Returns401()
    {
        // Arrange
        SetupStreamingContext();
        var request = new AgentMessageRequest { Content = "Test message" };

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task StreamAgentMessage_WhenContentIsEmpty_Returns400()
    {
        // Arrange
        SetupAuthenticatedStreamingContext("user-123");
        var request = new AgentMessageRequest { Content = "" };

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task StreamAgentMessage_WhenContentIsWhitespace_Returns400()
    {
        // Arrange
        SetupAuthenticatedStreamingContext("user-123");
        var request = new AgentMessageRequest { Content = "   " };

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task StreamAgentMessage_WhenConversationNotFound_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        _mockChatRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((ChatConversation?)null);

        // Act
        await _sut.StreamAgentMessage("non-existent", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("error");
        responseBody.Should().Contain("Conversation not found");
    }

    [Fact]
    public async Task StreamAgentMessage_WhenConversationBelongsToOtherUser_WritesAccessDeniedError()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", "other-user", "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("Access denied");
    }

    [Fact]
    public async Task StreamAgentMessage_WhenValidRequest_SetsSSEHeaders()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        // Set up agent service to return empty stream (simulate completion)
        _mockAgentService.Setup(s => s.ProcessStreamAsync(It.IsAny<AgentRequest>(), It.IsAny<CancellationToken>()))
            .Returns(AsyncEnumerable.Empty<AgentStreamEvent>());

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Headers["Content-Type"].ToString().Should().Contain("text/event-stream");
        context.Response.Headers["Cache-Control"].ToString().Should().Contain("no-cache");
    }

    [Fact]
    public async Task StreamAgentMessage_WhenOllamaProvider_TriesToGetUserPreferences()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        conversation.Provider = "Ollama";
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockUserPreferencesService.Setup(s => s.GetPreferencesAsync(userId))
            .ReturnsAsync(new UserPreferencesResponse
            {
                UseRemoteOllama = true,
                OllamaRemoteUrl = "http://remote-ollama:11434"
            });

        _mockAgentService.Setup(s => s.ProcessStreamAsync(It.IsAny<AgentRequest>(), It.IsAny<CancellationToken>()))
            .Returns(AsyncEnumerable.Empty<AgentStreamEvent>());

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        _mockUserPreferencesService.Verify(s => s.GetPreferencesAsync(userId), Times.Once);
    }

    [Fact]
    public async Task StreamAgentMessage_WhenNotSupportedException_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockAgentService.Setup(s => s.ProcessStreamAsync(It.IsAny<AgentRequest>(), It.IsAny<CancellationToken>()))
            .Throws(new NotSupportedException("Provider not supported"));

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("error");
    }

    [Fact]
    public async Task StreamAgentMessage_WhenGeneralException_WritesErrorEvent()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedStreamingContext(userId);
        var request = new AgentMessageRequest { Content = "Test message" };

        var conversation = CreateTestConversation("conv-1", userId, "Test");
        _mockChatRepository.Setup(r => r.GetByIdAsync("conv-1"))
            .ReturnsAsync(conversation);

        _mockAgentService.Setup(s => s.ProcessStreamAsync(It.IsAny<AgentRequest>(), It.IsAny<CancellationToken>()))
            .Throws(new Exception("Unexpected error"));

        // Act
        await _sut.StreamAgentMessage("conv-1", request);

        // Assert
        var context = _sut.ControllerContext.HttpContext;
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("error");
    }

    #endregion

    #region SupportedProvidersResponse DTO Tests

    [Fact]
    public void SupportedProvidersResponse_DefaultProviders_IsEmptyList()
    {
        // Act
        var response = new SupportedProvidersResponse();

        // Assert
        response.Providers.Should().BeEmpty();
    }

    [Fact]
    public void SupportedProvidersResponse_CanSetProviders()
    {
        // Arrange & Act
        var response = new SupportedProvidersResponse
        {
            Providers = new List<ProviderSupport>
            {
                new() { Name = "OpenAI", Supported = true }
            }
        };

        // Assert
        response.Providers.Should().HaveCount(1);
    }

    #endregion

    #region CapabilitiesResponse DTO Tests

    [Fact]
    public void CapabilitiesResponse_DefaultCapabilities_IsEmptyList()
    {
        // Act
        var response = new CapabilitiesResponse();

        // Assert
        response.Capabilities.Should().BeEmpty();
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
            Messages = new List<ChatMessage>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

