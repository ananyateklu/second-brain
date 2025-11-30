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
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly Mock<ILogger<AgentService>> _mockLogger;
    private readonly AIProvidersSettings _settings;
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

        _mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        _mockSettings.Setup(s => s.Value).Returns(_settings);

        _sut = new AgentService(
            _mockSettings.Object,
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
}

