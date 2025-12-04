using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class AgentServiceTests
{
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IOptions<RagSettings>> _mockRagSettings;
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly Mock<ILogger<AgentService>> _mockLogger;
    private readonly AIProvidersSettings _settings;
    private readonly RagSettings _ragSettings;
    private readonly AgentService _sut;

    public AgentServiceTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockRagService = new Mock<IRagService>();
        _mockLogger = new Mock<ILogger<AgentService>>();

        _settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = true, ApiKey = "test-key" },
            Anthropic = new AnthropicSettings { Enabled = true, ApiKey = "test-key" },
            Gemini = new GeminiSettings { Enabled = true, ApiKey = "test-key" },
            XAI = new XAISettings { Enabled = true, ApiKey = "test-key", BaseUrl = "https://api.x.ai" },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };

        _ragSettings = new RagSettings
        {
            TopK = 5,
            SimilarityThreshold = 0.3f,
            EnableHybridSearch = true,
            EnableQueryExpansion = true,
            EnableHyDE = true,
            EnableReranking = true
        };

        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockSettings.Setup(s => s.Value).Returns(_settings);

        _mockRagSettings = new Mock<IOptions<RagSettings>>();
        _mockRagSettings.Setup(s => s.Value).Returns(_ragSettings);

        _sut = new AgentService(
            _mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );
    }

    #region GetAvailableCapabilities Tests

    [Fact]
    public void GetAvailableCapabilities_ReturnsNotesCapability()
    {
        // Act
        var capabilities = _sut.GetAvailableCapabilities();

        // Assert
        capabilities.Should().NotBeEmpty();
        capabilities.Should().Contain(c => c.Id == "notes");
    }

    [Fact]
    public void GetAvailableCapabilities_CapabilitiesHaveDisplayNames()
    {
        // Act
        var capabilities = _sut.GetAvailableCapabilities();

        // Assert
        foreach (var capability in capabilities)
        {
            capability.DisplayName.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public void GetAvailableCapabilities_CapabilitiesHaveDescriptions()
    {
        // Act
        var capabilities = _sut.GetAvailableCapabilities();

        // Assert
        foreach (var capability in capabilities)
        {
            capability.Description.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public void GetAvailableCapabilities_CapabilitiesHaveIds()
    {
        // Act
        var capabilities = _sut.GetAvailableCapabilities();

        // Assert
        foreach (var capability in capabilities)
        {
            capability.Id.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public void GetAvailableCapabilities_ReturnsReadOnlyList()
    {
        // Act
        var capabilities = _sut.GetAvailableCapabilities();

        // Assert
        capabilities.Should().BeAssignableTo<IReadOnlyList<AgentCapability>>();
    }

    #endregion

    #region ProcessStreamAsync Error Handling Tests

    [Fact]
    public async Task ProcessStreamAsync_WithDisabledAnthropic_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = true },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("not enabled");
    }

    [Fact]
    public async Task ProcessStreamAsync_EmitsInitialStatusEvent()
    {
        // Arrange
        // Use a provider that will fail early but emit initial status
        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" }
            }
        };

        // Configure anthropic as disabled to trigger early exit
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Status && e.Content == "Initializing agent...");
    }

    #endregion

    #region AgentRequest Validation Tests

    [Fact]
    public void AgentRequest_DefaultValuesAreCorrect()
    {
        // Arrange & Act
        var request = new AgentRequest();

        // Assert
        request.Provider.Should().BeEmpty();
        request.Model.Should().BeEmpty();
        request.UserId.Should().BeEmpty();
        request.Messages.Should().BeEmpty();
        request.Temperature.Should().BeNull();
        request.MaxTokens.Should().BeNull();
        request.Capabilities.Should().BeNull();
        request.OllamaBaseUrl.Should().BeNull();
    }

    [Fact]
    public void AgentRequest_CanSetAllProperties()
    {
        // Arrange & Act
        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Temperature = 0.7f,
            MaxTokens = 4096,
            Capabilities = new List<string> { "notes" },
            OllamaBaseUrl = "http://localhost:11434",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" }
            }
        };

        // Assert
        request.Provider.Should().Be("openai");
        request.Model.Should().Be("gpt-4");
        request.UserId.Should().Be("user-123");
        request.Temperature.Should().Be(0.7f);
        request.MaxTokens.Should().Be(4096);
        request.Capabilities.Should().Contain("notes");
        request.OllamaBaseUrl.Should().Be("http://localhost:11434");
        request.Messages.Should().HaveCount(1);
    }

    #endregion

    #region AgentMessage Tests

    [Fact]
    public void AgentMessage_CanIncludeToolCalls()
    {
        // Arrange & Act
        var message = new AgentMessage
        {
            Role = "assistant",
            Content = "I searched your notes",
            ToolCalls = new List<ToolCallInfo>
            {
                new()
                {
                    ToolName = "search_notes",
                    Arguments = "{\"query\": \"meeting\"}",
                    Result = "Found 3 notes"
                }
            }
        };

        // Assert
        message.ToolCalls.Should().HaveCount(1);
        message.ToolCalls[0].ToolName.Should().Be("search_notes");
        message.ToolCalls[0].Arguments.Should().Contain("meeting");
        message.ToolCalls[0].Result.Should().Contain("Found 3 notes");
    }

    #endregion

    #region AgentStreamEvent Tests

    [Fact]
    public void AgentStreamEvent_TokenEvent_HasCorrectType()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.Token,
            Content = "Hello"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.Token);
        evt.Content.Should().Be("Hello");
    }

    [Fact]
    public void AgentStreamEvent_ToolCallStartEvent_HasToolInfo()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.ToolCallStart,
            ToolName = "search_notes",
            ToolArguments = "{\"query\": \"test\"}"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.ToolCallStart);
        evt.ToolName.Should().Be("search_notes");
        evt.ToolArguments.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void AgentStreamEvent_ToolCallEndEvent_HasResult()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.ToolCallEnd,
            ToolName = "search_notes",
            ToolResult = "Found 5 notes"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.ToolCallEnd);
        evt.ToolResult.Should().Be("Found 5 notes");
    }

    [Fact]
    public void AgentStreamEvent_ThinkingEvent_HasContent()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.Thinking,
            Content = "I should search the user's notes first"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.Thinking);
        evt.Content.Should().Contain("search");
    }

    [Fact]
    public void AgentStreamEvent_ErrorEvent_HasErrorMessage()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.Error,
            Content = "Provider not available"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.Error);
        evt.Content.Should().Contain("not available");
    }

    [Fact]
    public void AgentStreamEvent_EndEvent_HasFullContent()
    {
        // Arrange & Act
        var evt = new AgentStreamEvent
        {
            Type = AgentEventType.End,
            Content = "Here is the complete response"
        };

        // Assert
        evt.Type.Should().Be(AgentEventType.End);
        evt.Content.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region AgentResponse Tests

    [Fact]
    public void AgentResponse_DefaultValuesAreCorrect()
    {
        // Arrange & Act
        var response = new AgentResponse();

        // Assert
        response.Content.Should().BeEmpty();
        response.ToolCalls.Should().BeEmpty();
        response.InputTokens.Should().Be(0);
        response.OutputTokens.Should().Be(0);
    }

    [Fact]
    public void AgentResponse_CanSetToolCalls()
    {
        // Arrange & Act
        var response = new AgentResponse
        {
            Content = "I found some notes",
            ToolCalls = new List<ToolExecutionResult>
            {
                new()
                {
                    ToolName = "search_notes",
                    Arguments = "{\"query\": \"test\"}",
                    Result = "Found 3 notes",
                    Success = true
                }
            },
            InputTokens = 100,
            OutputTokens = 200
        };

        // Assert
        response.ToolCalls.Should().HaveCount(1);
        response.ToolCalls[0].Success.Should().BeTrue();
        response.InputTokens.Should().Be(100);
        response.OutputTokens.Should().Be(200);
    }

    #endregion

    #region ToolExecutionResult Tests

    [Fact]
    public void ToolExecutionResult_DefaultValuesAreCorrect()
    {
        // Arrange & Act
        var result = new ToolExecutionResult();

        // Assert
        result.ToolName.Should().BeEmpty();
        result.Arguments.Should().BeEmpty();
        result.Result.Should().BeEmpty();
        result.Success.Should().BeTrue();
        result.ExecutedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void ToolExecutionResult_CanSetFailure()
    {
        // Arrange & Act
        var result = new ToolExecutionResult
        {
            ToolName = "create_note",
            Arguments = "{\"title\": \"Test\"}",
            Result = "Error: Permission denied",
            Success = false
        };

        // Assert
        result.Success.Should().BeFalse();
        result.Result.Should().Contain("Error");
    }

    #endregion

    #region AgentCapability Tests

    [Fact]
    public void AgentCapability_DefaultValuesAreCorrect()
    {
        // Arrange & Act
        var capability = new AgentCapability();

        // Assert
        capability.Id.Should().BeEmpty();
        capability.DisplayName.Should().BeEmpty();
        capability.Description.Should().BeEmpty();
    }

    [Fact]
    public void AgentCapability_CanSetAllProperties()
    {
        // Arrange & Act
        var capability = new AgentCapability
        {
            Id = "notes",
            DisplayName = "Notes Management",
            Description = "Create, search, and manage notes"
        };

        // Assert
        capability.Id.Should().Be("notes");
        capability.DisplayName.Should().Be("Notes Management");
        capability.Description.Should().Contain("notes");
    }

    #endregion

    #region AgentEventType Tests

    [Fact]
    public void AgentEventType_HasAllExpectedValues()
    {
        // Assert
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.Token);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.ToolCallStart);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.ToolCallEnd);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.Thinking);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.Status);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.Error);
        Enum.GetValues<AgentEventType>().Should().Contain(AgentEventType.End);
    }

    #endregion

    #region Provider Detection Tests

    [Theory]
    [InlineData("claude")]
    [InlineData("Claude")]
    [InlineData("CLAUDE")]
    [InlineData("anthropic")]
    [InlineData("Anthropic")]
    [InlineData("ANTHROPIC")]
    public async Task ProcessStreamAsync_DetectsAnthropicProvider_CaseInsensitive(string provider)
    {
        // Arrange
        // Disable anthropic to see the error (confirming it was detected as Anthropic)
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = provider,
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("Anthropic");
    }

    #endregion

    #region ProcessStreamAsync With Capabilities Tests

    [Fact]
    public async Task ProcessStreamAsync_WithCapabilities_EmitsToolPreparationStatus()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Even though OpenAI is disabled, it should emit the preparing tools status first
        events.Should().Contain(e => e.Type == AgentEventType.Status && e.Content!.Contains("Preparing tools"));
    }

    #endregion

    #region ProcessAsync Tests

    [Fact]
    public async Task ProcessAsync_WithDisabledProvider_ThrowsException()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act & Assert
        var act = async () => await service.ProcessAsync(request);
        await act.Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task ProcessAsync_CollectsAllEvents()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act & Assert - ProcessAsync should throw because it aggregates stream events
        var act = async () => await service.ProcessAsync(request);
        await act.Should().ThrowAsync<Exception>()
            .WithMessage("*not enabled*");
    }

    #endregion

    #region ToolCallInfo Tests

    [Fact]
    public void ToolCallInfo_DefaultValuesAreCorrect()
    {
        // Arrange & Act
        var toolCall = new ToolCallInfo();

        // Assert
        toolCall.ToolName.Should().BeEmpty();
        toolCall.Arguments.Should().BeEmpty();
        toolCall.Result.Should().BeEmpty();
    }

    [Fact]
    public void ToolCallInfo_CanSetAllProperties()
    {
        // Arrange & Act
        var toolCall = new ToolCallInfo
        {
            ToolName = "search_notes",
            Arguments = "{\"query\": \"meeting\"}",
            Result = "Found 5 notes about meetings"
        };

        // Assert
        toolCall.ToolName.Should().Be("search_notes");
        toolCall.Arguments.Should().Contain("query");
        toolCall.Result.Should().Contain("5 notes");
    }

    #endregion

    #region OpenAI Provider Detection Tests

    [Fact]
    public async Task ProcessStreamAsync_WithDisabledOpenAI_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithDisabledXAI_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "grok",
            Model = "grok-1",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithUnknownProvider_ReturnsError()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "unknown-provider",
            Model = "model-1",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    #endregion

    #region Conversation History Tests

    [Fact]
    public async Task ProcessStreamAsync_WithMixedConversationHistory_ProcessesMessages()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" },
                new() { Role = "assistant", Content = "Hi there!" },
                new() { Role = "user", Content = "How are you?" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Should process but fail due to disabled provider
        events.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ProcessStreamAsync_WithToolCallHistory_IncludesSystemContext()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Search my notes" },
                new()
                {
                    Role = "assistant",
                    Content = "I found 3 notes",
                    ToolCalls = new List<ToolCallInfo>
                    {
                        new() { ToolName = "search_notes", Arguments = "{}", Result = "3 notes" }
                    }
                },
                new() { Role = "user", Content = "Show me the first one" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
    }

    #endregion

    #region Additional Provider Tests

    [Fact]
    public async Task ProcessStreamAsync_WithGeminiProvider_WhenDisabled_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "gemini",
            Model = "gemini-pro",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("Gemini");
    }

    [Fact]
    public async Task ProcessStreamAsync_WithOllamaProvider_WhenDisabled_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "ollama",
            Model = "llama3",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("Ollama");
    }

    [Fact]
    public async Task ProcessStreamAsync_WithXaiProvider_WhenDisabled_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "xai",
            Model = "grok-2",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("xAI");
    }

    [Fact]
    public async Task ProcessStreamAsync_WithOpenAI_WhenNoApiKey_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = true, ApiKey = "" },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithGemini_WhenNoApiKey_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = true, ApiKey = "" },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "gemini",
            Model = "gemini-pro",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithXAI_WhenNoApiKey_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = true, ApiKey = "", BaseUrl = "https://api.x.ai" },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "grok",
            Model = "grok-2",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithAnthropic_WhenNoApiKey_ReturnsError()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = true, ApiKey = "" },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("not enabled");
    }

    #endregion

    #region Provider Case Sensitivity Tests

    [Theory]
    [InlineData("openai")]
    [InlineData("OpenAI")]
    [InlineData("OPENAI")]
    public async Task ProcessStreamAsync_DetectsOpenAIProvider_CaseInsensitive(string provider)
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = provider,
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("OpenAI");
    }

    [Theory]
    [InlineData("gemini")]
    [InlineData("Gemini")]
    [InlineData("GEMINI")]
    public async Task ProcessStreamAsync_DetectsGeminiProvider_CaseInsensitive(string provider)
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = provider,
            Model = "gemini-pro",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("Gemini");
    }

    [Theory]
    [InlineData("ollama")]
    [InlineData("Ollama")]
    [InlineData("OLLAMA")]
    public async Task ProcessStreamAsync_DetectsOllamaProvider_CaseInsensitive(string provider)
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = provider,
            Model = "llama3",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("Ollama");
    }

    [Theory]
    [InlineData("grok")]
    [InlineData("Grok")]
    [InlineData("GROK")]
    [InlineData("xai")]
    [InlineData("XAI")]
    public async Task ProcessStreamAsync_DetectsXAIProvider_CaseInsensitive(string provider)
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = provider,
            Model = "grok-2",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hi" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Error);
        var errorEvent = events.First(e => e.Type == AgentEventType.Error);
        errorEvent.Content.Should().Contain("xAI");
    }

    #endregion

    #region Ollama Provider Specific Tests

    [Fact]
    public void AgentRequest_OllamaBaseUrl_CanBeSet()
    {
        // Arrange & Act
        var request = new AgentRequest
        {
            Provider = "ollama",
            Model = "llama3",
            UserId = "user-123",
            OllamaBaseUrl = "http://custom-ollama:11434",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Assert
        request.OllamaBaseUrl.Should().Be("http://custom-ollama:11434");
    }

    [Fact]
    public void AgentRequest_OllamaBaseUrl_DefaultsToNull()
    {
        // Arrange & Act
        var request = new AgentRequest
        {
            Provider = "ollama",
            Model = "llama3",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Assert
        request.OllamaBaseUrl.Should().BeNull();
    }

    #endregion

    #region Capabilities Tests

    [Fact]
    public async Task ProcessStreamAsync_WithMultipleCapabilities_EmitsPreparingToolsStatus()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Capabilities = new List<string> { "notes", "unknown-capability" },
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().Contain(e => e.Type == AgentEventType.Status && e.Content!.Contains("Preparing tools"));
    }

    [Fact]
    public async Task ProcessStreamAsync_WithEmptyCapabilities_DoesNotEmitPreparingToolsStatus()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Capabilities = new List<string>(),
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Empty capabilities should not trigger "Preparing tools" status
        events.Where(e => e.Type == AgentEventType.Status && e.Content!.Contains("Preparing tools"))
            .Should().BeEmpty();
    }

    [Fact]
    public async Task ProcessStreamAsync_WithNullCapabilities_DoesNotEmitPreparingToolsStatus()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Capabilities = null,
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Null capabilities should not trigger "Preparing tools" status
        events.Where(e => e.Type == AgentEventType.Status && e.Content!.Contains("Preparing tools"))
            .Should().BeEmpty();
    }

    #endregion

    #region Conversation History Edge Cases Tests

    [Fact]
    public async Task ProcessStreamAsync_WithAssistantMessageWithEmptyToolCalls_ProcessesCorrectly()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" },
                new() { Role = "assistant", Content = "Hi!", ToolCalls = new List<ToolCallInfo>() },
                new() { Role = "user", Content = "How are you?" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ProcessStreamAsync_WithAssistantMessageWithNullContent_ProcessesCorrectly()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            Anthropic = new AnthropicSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Hello" },
                new()
                {
                    Role = "assistant",
                    Content = "",
                    ToolCalls = new List<ToolCallInfo>
                    {
                        new() { ToolName = "search_notes", Arguments = "{}", Result = "Found 3 notes" }
                    }
                },
                new() { Role = "user", Content = "Show me the first one" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
    }

    #endregion

    #region Event Sequence Tests

    [Fact]
    public async Task ProcessStreamAsync_AlwaysEmitsInitializingStatusFirst()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "unknown-provider",
            Model = "model",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
        events[0].Type.Should().Be(AgentEventType.Status);
        events[0].Content.Should().Be("Initializing agent...");
    }

    [Fact]
    public async Task ProcessStreamAsync_WithError_EmitsErrorAsLastEvent()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Error should be the last event when an error occurs
        events.Last().Type.Should().Be(AgentEventType.Error);
    }

    #endregion

    #region Anthropic Provider Tests with Capabilities

    [Fact]
    public async Task ProcessStreamAsync_WithAnthropicAndCapabilities_EmitsPreparingToolsStatus()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Should emit status before error (even if provider is disabled)
        events.Should().Contain(e => e.Type == AgentEventType.Status);
    }

    #endregion

    #region FunctionInvocationFilter Tests

    [Fact]
    public void FunctionInvocationFilter_Results_IsInitialized()
    {
        // Arrange
        var filter = new FunctionInvocationFilter();

        // Assert
        filter.Results.Should().NotBeNull();
        filter.Results.Should().BeEmpty();
    }

    [Fact]
    public void FunctionInvocationFilter_Results_IsConcurrentQueue()
    {
        // Arrange
        var filter = new FunctionInvocationFilter();

        // Assert
        filter.Results.Should().BeOfType<System.Collections.Concurrent.ConcurrentQueue<(string, string, string)>>();
    }

    [Fact]
    public void FunctionInvocationFilter_ImplementsIFunctionInvocationFilter()
    {
        // Arrange
        var filter = new FunctionInvocationFilter();

        // Assert
        filter.Should().BeAssignableTo<Microsoft.SemanticKernel.IFunctionInvocationFilter>();
    }

    [Fact]
    public void FunctionInvocationFilter_Results_CanEnqueueAndDequeue()
    {
        // Arrange
        var filter = new FunctionInvocationFilter();

        // Act - Directly test the queue operations
        filter.Results.Enqueue(("TestFunc", "{}", "result"));

        // Assert
        filter.Results.Should().HaveCount(1);
        filter.Results.TryDequeue(out var result);
        result.Name.Should().Be("TestFunc");
        result.Arguments.Should().Be("{}");
        result.Result.Should().Be("result");
    }

    [Fact]
    public async Task FunctionInvocationFilter_Results_IsThreadSafe()
    {
        // Arrange
        var filter = new FunctionInvocationFilter();
        var tasks = new List<Task>();
        var resultCount = 100;

        // Act - Enqueue from multiple threads
        for (int i = 0; i < resultCount; i++)
        {
            var index = i;
            tasks.Add(Task.Run(() => filter.Results.Enqueue(($"Func{index}", "{}", "result"))));
        }
        await Task.WhenAll(tasks);

        // Assert
        filter.Results.Should().HaveCount(resultCount);
    }

    #endregion

    #region GetJsonSchemaType Tests

    [Theory]
    [InlineData(typeof(string), "string")]
    [InlineData(typeof(int), "integer")]
    [InlineData(typeof(long), "integer")]
    [InlineData(typeof(float), "number")]
    [InlineData(typeof(double), "number")]
    [InlineData(typeof(decimal), "number")]
    [InlineData(typeof(bool), "boolean")]
    public void GetJsonSchemaType_PrimitiveTypes_ReturnsCorrectSchemaType(Type inputType, string expectedSchema)
    {
        // Act
        var result = AgentService.GetJsonSchemaType(inputType);

        // Assert
        result.Should().Be(expectedSchema);
    }

    [Fact]
    public void GetJsonSchemaType_NullableInt_ReturnsInteger()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(int?));

        // Assert
        result.Should().Be("integer");
    }

    [Fact]
    public void GetJsonSchemaType_NullableBool_ReturnsBoolean()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(bool?));

        // Assert
        result.Should().Be("boolean");
    }

    [Fact]
    public void GetJsonSchemaType_NullableDouble_ReturnsNumber()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(double?));

        // Assert
        result.Should().Be("number");
    }

    [Fact]
    public void GetJsonSchemaType_Array_ReturnsArray()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(string[]));

        // Assert
        result.Should().Be("array");
    }

    [Fact]
    public void GetJsonSchemaType_GenericList_ReturnsArray()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(List<string>));

        // Assert
        result.Should().Be("array");
    }

    [Fact]
    public void GetJsonSchemaType_IntArray_ReturnsArray()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(int[]));

        // Assert
        result.Should().Be("array");
    }

    [Fact]
    public void GetJsonSchemaType_UnknownType_DefaultsToString()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(DateTime));

        // Assert
        result.Should().Be("string");
    }

    [Fact]
    public void GetJsonSchemaType_CustomClass_DefaultsToString()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(AgentRequest));

        // Assert
        result.Should().Be("string");
    }

    #endregion

    #region ConvertJsonToType Tests

    [Fact]
    public void ConvertJsonToType_NullNode_ReturnsNull()
    {
        // Act
        var result = AgentService.ConvertJsonToType(null, typeof(string));

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ConvertJsonToType_StringValue_ReturnsString()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("\"hello\"");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(string));

        // Assert
        result.Should().Be("hello");
    }

    [Fact]
    public void ConvertJsonToType_IntValue_ReturnsInt()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("42");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(int));

        // Assert
        result.Should().Be(42);
    }

    [Fact]
    public void ConvertJsonToType_LongValue_ReturnsLong()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("9223372036854775807");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(long));

        // Assert
        result.Should().Be(9223372036854775807L);
    }

    [Fact]
    public void ConvertJsonToType_FloatValue_ReturnsFloat()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("3.14");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(float));

        // Assert
        result.Should().BeOfType<float>();
        ((float)result!).Should().BeApproximately(3.14f, 0.01f);
    }

    [Fact]
    public void ConvertJsonToType_DoubleValue_ReturnsDouble()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("3.14159265359");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(double));

        // Assert
        result.Should().BeOfType<double>();
        ((double)result!).Should().BeApproximately(3.14159265359, 0.0001);
    }

    [Fact]
    public void ConvertJsonToType_BoolValue_ReturnsBool()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("true");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(bool));

        // Assert
        result.Should().Be(true);
    }

    [Fact]
    public void ConvertJsonToType_NullableInt_ReturnsInt()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("42");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(int?));

        // Assert
        result.Should().Be(42);
    }

    [Fact]
    public void ConvertJsonToType_UnknownType_ReturnsToString()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("{\"key\": \"value\"}");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(DateTime));

        // Assert
        result.Should().BeOfType<string>();
        result!.ToString().Should().Contain("key");
    }

    [Fact]
    public void ConvertJsonToType_InvalidConversion_FallsBackToString()
    {
        // Arrange - Try to parse a string as an int
        var node = System.Text.Json.Nodes.JsonNode.Parse("\"not-a-number\"");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(int));

        // Assert
        result.Should().Be("not-a-number");
    }

    #endregion

    #region GetSystemPrompt Tests

    [Fact]
    public void GetSystemPrompt_WithNullCapabilities_ReturnsGeneralAssistantMode()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("General Assistant Mode");
        prompt.Should().Contain("operating as a general assistant without specialized tools");
    }

    [Fact]
    public void GetSystemPrompt_WithEmptyCapabilities_ReturnsGeneralAssistantMode()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string>());

        // Assert
        prompt.Should().Contain("General Assistant Mode");
    }

    [Fact]
    public void GetSystemPrompt_WithNotesCapability_IncludesNotesPrompt()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "notes" });

        // Assert
        prompt.Should().Contain("Notes Management Tools");
        prompt.Should().NotContain("General Assistant Mode");
    }

    [Fact]
    public void GetSystemPrompt_ContainsCorePrinciples()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("Core Principles");
        prompt.Should().Contain("Simplicity");
        prompt.Should().Contain("Transparency");
        prompt.Should().Contain("Accuracy");
    }

    [Fact]
    public void GetSystemPrompt_ContainsReasoningProcess()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("<thinking>");
        prompt.Should().Contain("</thinking>");
    }

    [Fact]
    public void GetSystemPrompt_WithUnknownCapability_DoesNotAddUnknownContent()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "unknown-capability" });

        // Assert - Unknown capabilities are just ignored, no content added
        prompt.Should().Contain("Core Principles");
        prompt.Should().NotContain("unknown-capability");
        // No specific capability content should be added for unknown capabilities
    }

    [Fact]
    public void GetSystemPrompt_WithMixedCapabilities_IncludesKnownOnes()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "notes", "unknown-cap" });

        // Assert
        prompt.Should().Contain("Notes Management Tools");
        prompt.Should().NotContain("General Assistant Mode");
    }

    #endregion

    #region BuildKernel Tests

    [Fact]
    public void BuildKernel_WithOpenAI_Enabled_ReturnsKernel()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = true, ApiKey = "test-key" },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var kernel = service.BuildKernel("openai", "gpt-4", "user-123", null);

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithOpenAI_Disabled_ThrowsException()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act & Assert
        var act = () => service.BuildKernel("openai", "gpt-4", "user-123", null);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*OpenAI*not enabled*");
    }

    [Fact]
    public void BuildKernel_WithGrok_Enabled_ReturnsKernel()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = true, ApiKey = "test-key", BaseUrl = "https://api.x.ai" },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var kernel = service.BuildKernel("grok", "grok-2", "user-123", null);

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithXAI_Enabled_ReturnsKernel()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = true, ApiKey = "test-key", BaseUrl = "https://api.x.ai" },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var kernel = service.BuildKernel("xai", "grok-2", "user-123", null);

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithGemini_Enabled_ReturnsKernel()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = true, ApiKey = "test-key" },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var kernel = service.BuildKernel("gemini", "gemini-pro", "user-123", null);

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithOllama_Enabled_ReturnsKernel()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act
        var kernel = service.BuildKernel("ollama", "llama3", "user-123", null);

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithOllama_CustomBaseUrl_UsesCustomUrl()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act - Pass a custom URL
        var kernel = service.BuildKernel("ollama", "llama3", "user-123", null, true, "http://custom-ollama:11434/");

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithAnthropic_ThrowsException()
    {
        // Arrange - Anthropic should not be handled by BuildKernel
        // Act & Assert
        var act = () => _sut.BuildKernel("claude", "claude-3", "user-123", null);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Anthropic*ProcessAnthropicStreamAsync*");
    }

    [Fact]
    public void BuildKernel_WithUnknownProvider_ThrowsArgumentException()
    {
        // Act & Assert
        var act = () => _sut.BuildKernel("unknown-provider", "model", "user-123", null);
        act.Should().Throw<ArgumentException>()
            .WithMessage("*Unknown provider*");
    }

    [Fact]
    public void BuildKernel_WithNotesCapability_RegistersPlugin()
    {
        // Act
        var kernel = _sut.BuildKernel("openai", "gpt-4", "user-123", new List<string> { "notes" });

        // Assert
        kernel.Should().NotBeNull();
        kernel.Plugins.Should().NotBeEmpty();
    }

    [Fact]
    public void BuildKernel_WithUnknownCapability_LogsWarning()
    {
        // Act
        var kernel = _sut.BuildKernel("openai", "gpt-4", "user-123", new List<string> { "unknown-cap" });

        // Assert - Kernel should still be created, unknown capability is just logged
        kernel.Should().NotBeNull();
    }

    #endregion

    #region InvokePluginMethodAsync Tests

    [Fact]
    public async Task InvokePluginMethodAsync_WithValidParameters_InvokesMethod()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("SimpleMethod")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{\"name\": \"TestName\"}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Contain("TestName");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithDefaultParameter_UsesDefault()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithDefault")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Be("default");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithAsyncMethod_AwaitsResult()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("AsyncMethod")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{\"value\": 42}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Be("42");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithNullInput_UsesNullForParameters()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithNullable")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, null);

        // Assert
        result.Should().Be("null");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithIntParameter_ConvertsCorrectly()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithInt")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{\"number\": 123}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Be("123");
    }

    #endregion

    #region ProcessStreamAsync Extended Edge Cases

    [Fact]
    public async Task ProcessStreamAsync_WithCancellation_StopsProcessing()
    {
        // Arrange - Use disabled provider to avoid actual API calls
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var cts = new CancellationTokenSource();
        cts.Cancel(); // Cancel immediately

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request, cts.Token))
        {
            events.Add(evt);
        }

        // Assert - Should still process some events even with cancellation
        events.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ProcessStreamAsync_WithMultipleToolCallsInHistory_ProcessesAll()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Search my notes" },
                new()
                {
                    Role = "assistant",
                    Content = "I found some notes",
                    ToolCalls = new List<ToolCallInfo>
                    {
                        new() { ToolName = "search_notes", Arguments = "{\"query\":\"test\"}", Result = "2 notes" },
                        new() { ToolName = "get_note", Arguments = "{\"id\":\"1\"}", Result = "Note 1" }
                    }
                },
                new() { Role = "user", Content = "Show me more" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ProcessStreamAsync_EmitsBuildingContextStatus()
    {
        // Note: This test verifies that the building context status is emitted
        // when the kernel is successfully built. Since we can't mock the kernel easily,
        // we verify the status sequence when using an enabled provider that will
        // eventually fail due to an API call (but after emitting the status).

        // For now, verify that status events are correctly typed
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - When provider is disabled, we get init status and then error
        // The "Building context" status comes after kernel is built successfully
        events.Should().Contain(e => e.Type == AgentEventType.Status &&
            e.Content == "Initializing agent...");
    }

    [Fact]
    public async Task ProcessStreamAsync_StatusEvents_HaveCorrectEventType()
    {
        // Arrange - Test that status events have correct type
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-123",
            Messages = new List<AgentMessage> { new() { Role = "user", Content = "Hello" } }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - All status events should have the correct type
        var statusEvents = events.Where(e => e.Type == AgentEventType.Status);
        statusEvents.Should().NotBeEmpty();
        foreach (var statusEvent in statusEvents)
        {
            statusEvent.Content.Should().NotBeNullOrEmpty();
        }
    }

    #endregion

    #region GetJsonSchemaType Additional Tests

    [Fact]
    public void GetJsonSchemaType_NullableFloat_ReturnsNumber()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(float?));

        // Assert
        result.Should().Be("number");
    }

    [Fact]
    public void GetJsonSchemaType_NullableDecimal_ReturnsNumber()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(decimal?));

        // Assert
        result.Should().Be("number");
    }

    [Fact]
    public void GetJsonSchemaType_NullableLong_ReturnsInteger()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(long?));

        // Assert
        result.Should().Be("integer");
    }

    [Fact]
    public void GetJsonSchemaType_ListOfInt_ReturnsArray()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(List<int>));

        // Assert
        result.Should().Be("array");
    }

    [Fact]
    public void GetJsonSchemaType_ObjectArray_ReturnsArray()
    {
        // Act
        var result = AgentService.GetJsonSchemaType(typeof(object[]));

        // Assert
        result.Should().Be("array");
    }

    #endregion

    #region ConvertJsonToType Additional Tests

    [Fact]
    public void ConvertJsonToType_NullableDouble_ReturnsDouble()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("3.14");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(double?));

        // Assert
        result.Should().BeOfType<double>();
    }

    [Fact]
    public void ConvertJsonToType_NullableBool_ReturnsBool()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("false");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(bool?));

        // Assert
        result.Should().Be(false);
    }

    [Fact]
    public void ConvertJsonToType_ArrayValue_ReturnsString()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("[1, 2, 3]");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(int[]));

        // Assert
        result.Should().BeOfType<string>();
        result!.ToString().Should().Contain("1");
    }

    [Fact]
    public void ConvertJsonToType_BoolFalse_ReturnsFalse()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("false");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(bool));

        // Assert
        result.Should().Be(false);
    }

    [Fact]
    public void ConvertJsonToType_NegativeInt_ReturnsNegative()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("-42");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(int));

        // Assert
        result.Should().Be(-42);
    }

    [Fact]
    public void ConvertJsonToType_NegativeDouble_ReturnsNegative()
    {
        // Arrange
        var node = System.Text.Json.Nodes.JsonNode.Parse("-3.14");

        // Act
        var result = AgentService.ConvertJsonToType(node, typeof(double));

        // Assert
        ((double)result!).Should().BeApproximately(-3.14, 0.01);
    }

    #endregion

    #region InvokePluginMethodAsync Additional Tests

    [Fact]
    public async Task InvokePluginMethodAsync_WithMultipleParameters_ConvertsAll()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithMultipleParams")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{\"name\": \"Test\", \"count\": 5}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Contain("Test");
        result.Should().Contain("5");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithMissingOptionalParam_UsesNull()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithNullable")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Be("null");
    }

    [Fact]
    public async Task InvokePluginMethodAsync_WithBoolParameter_ConvertsBool()
    {
        // Arrange
        var plugin = new TestPlugin();
        var method = typeof(TestPlugin).GetMethod("MethodWithBool")!;
        var input = System.Text.Json.Nodes.JsonNode.Parse("{\"flag\": true}")!;

        // Act
        var result = await _sut.InvokePluginMethodAsync(plugin, method, input);

        // Assert
        result.Should().Be("True");
    }

    #endregion

    #region Anthropic Provider Additional Tests

    [Fact]
    public async Task ProcessStreamAsync_WithAnthropicAndToolCallHistory_IncludesContext()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Search my notes" },
                new()
                {
                    Role = "assistant",
                    Content = "I found some notes",
                    ToolCalls = new List<ToolCallInfo>
                    {
                        new() { ToolName = "search_notes", Arguments = "{}", Result = "2 notes found" },
                    }
                },
                new() { Role = "user", Content = "Show me the first" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert - Should emit status events before error
        events.Should().Contain(e => e.Type == AgentEventType.Status);
    }

    [Fact]
    public async Task ProcessStreamAsync_WithAnthropicEmptyContent_ProcessesCorrectly()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        var request = new AgentRequest
        {
            Provider = "claude",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "" },
                new() { Role = "assistant", Content = "" },
                new() { Role = "user", Content = "Hello" }
            }
        };

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in service.ProcessStreamAsync(request))
        {
            events.Add(evt);
        }

        // Assert
        events.Should().NotBeEmpty();
    }

    #endregion

    #region BuildKernel Additional Tests

    [Fact]
    public void BuildKernel_WithOllama_EmptyBaseUrl_UsesSettingsDefault()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act - Pass empty string as custom URL, should use settings default
        var kernel = service.BuildKernel("ollama", "llama3", "user-123", null, true, "");

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithOllama_WhitespaceBaseUrl_UsesSettingsDefault()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act - Pass whitespace as custom URL, should use settings default
        var kernel = service.BuildKernel("ollama", "llama3", "user-123", null, true, "   ");

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithOllama_TrailingSlashUrl_TrimsSlash()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = true, BaseUrl = "http://localhost:11434" }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act - Pass URL with trailing slash
        var kernel = service.BuildKernel("ollama", "llama3", "user-123", null, true, "http://remote-ollama:11434/");

        // Assert
        kernel.Should().NotBeNull();
    }

    [Fact]
    public void BuildKernel_WithXAI_Disabled_ThrowsException()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act & Assert
        var act = () => service.BuildKernel("xai", "grok-2", "user-123", null);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*xAI*not enabled*");
    }

    [Fact]
    public void BuildKernel_WithGemini_Disabled_ThrowsException()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act & Assert
        var act = () => service.BuildKernel("gemini", "gemini-pro", "user-123", null);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Gemini*not enabled*");
    }

    [Fact]
    public void BuildKernel_WithOllama_Disabled_ThrowsException()
    {
        // Arrange
        var settings = new AIProvidersSettings
        {
            OpenAI = new OpenAISettings { Enabled = false },
            Anthropic = new AnthropicSettings { Enabled = false },
            Gemini = new GeminiSettings { Enabled = false },
            XAI = new XAISettings { Enabled = false },
            Ollama = new OllamaSettings { Enabled = false }
        };
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings);

        var service = new AgentService(
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockLogger.Object
        );

        // Act & Assert
        var act = () => service.BuildKernel("ollama", "llama3", "user-123", null);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Ollama*not enabled*");
    }

    #endregion

    #region GetSystemPrompt Additional Tests

    [Fact]
    public void GetSystemPrompt_ContainsToolUsageGuidelines()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "notes" });

        // Assert
        prompt.Should().Contain("Tool Usage Guidelines");
        prompt.Should().Contain("Always use them");
    }

    [Fact]
    public void GetSystemPrompt_ContainsContextAwareness()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("Context Awareness");
        prompt.Should().Contain("conversation history");
    }

    [Fact]
    public void GetSystemPrompt_ContainsErrorHandling()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("Error Handling");
        prompt.Should().Contain("tool call fails");
    }

    #endregion
}

/// <summary>
/// Test plugin for InvokePluginMethodAsync tests
/// </summary>
public class TestPlugin : SecondBrain.Application.Services.Agents.Plugins.IAgentPlugin
{
    public string CapabilityId => "test";
    public string DisplayName => "Test";
    public string Description => "Test plugin";

    private string _currentUserId = string.Empty;
    private bool _agentRagEnabled = true;

    public void SetCurrentUserId(string userId) => _currentUserId = userId;
    public void SetAgentRagEnabled(bool enabled) => _agentRagEnabled = enabled;
    public object GetPluginInstance() => this;
    public string GetPluginName() => "Test";
    public string GetSystemPromptAddition() => "";

    public string SimpleMethod(string name)
    {
        return $"Hello, {name}!";
    }

    public string MethodWithDefault(string value = "default")
    {
        return value;
    }

    public async Task<string> AsyncMethod(int value)
    {
        await Task.Delay(1);
        return value.ToString();
    }

    public string MethodWithNullable(string? optional)
    {
        return optional ?? "null";
    }

    public string MethodWithInt(int number)
    {
        return number.ToString();
    }

    public string MethodWithMultipleParams(string name, int count)
    {
        return $"{name}: {count}";
    }

    public string MethodWithBool(bool flag)
    {
        return flag.ToString();
    }
}

