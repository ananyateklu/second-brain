using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Strategies;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class AgentServiceTests
{
    private readonly Mock<IAgentStreamingStrategyFactory> _mockStrategyFactory;
    private readonly Mock<IOptions<AIProvidersSettings>> _mockSettings;
    private readonly Mock<IOptions<RagSettings>> _mockRagSettings;
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly Mock<IUserPreferencesService> _mockUserPreferencesService;
    private readonly Mock<ILogger<AgentService>> _mockLogger;
    private readonly AIProvidersSettings _settings;
    private readonly RagSettings _ragSettings;
    private readonly AgentService _sut;

    public AgentServiceTests()
    {
        _mockStrategyFactory = new Mock<IAgentStreamingStrategyFactory>();
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _mockRagService = new Mock<IRagService>();
        _mockUserPreferencesService = new Mock<IUserPreferencesService>();
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

        // Setup default user preferences mock
        _mockUserPreferencesService.Setup(s => s.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(new UserPreferencesResponse
            {
                RagEnableHyde = true,
                RagEnableQueryExpansion = true,
                RagEnableHybridSearch = true,
                RagEnableReranking = true,
                RagEnableAnalytics = true
            });

        _sut = new AgentService(
            _mockStrategyFactory.Object,
            _mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockUserPreferencesService.Object,
            _mockLogger.Object
        );
    }

    private AgentService CreateService(AIProvidersSettings? settings = null)
    {
        var mockSettings = new Mock<IOptions<AIProvidersSettings>>();
        mockSettings.Setup(s => s.Value).Returns(settings ?? _settings);

        return new AgentService(
            _mockStrategyFactory.Object,
            mockSettings.Object,
            _mockRagSettings.Object,
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _mockUserPreferencesService.Object,
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

    #region ProcessStreamAsync Tests

    [Fact]
    public async Task ProcessStreamAsync_EmitsInitialStatusEvent()
    {
        // Arrange
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

        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        var events = new List<AgentStreamEvent>
        {
            new() { Type = AgentEventType.Status, Content = "Test status" },
            new() { Type = AgentEventType.End, Content = "Done" }
        };
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Returns(events.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        var resultEvents = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessStreamAsync(request))
        {
            resultEvents.Add(evt);
        }

        // Assert
        resultEvents.Should().Contain(e => e.Type == AgentEventType.Status);
        resultEvents.First().Content.Should().Be("Initializing agent...");
    }

    [Fact]
    public async Task ProcessStreamAsync_DelegatesToStrategy()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Test message" }
            }
        };

        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        var strategyEvents = new List<AgentStreamEvent>
        {
            new() { Type = AgentEventType.Token, Content = "Hello" },
            new() { Type = AgentEventType.Token, Content = " World" },
            new() { Type = AgentEventType.End, Content = "Hello World" }
        };
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Returns(strategyEvents.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(request, _settings))
            .Returns(mockStrategy.Object);

        // Act
        var resultEvents = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessStreamAsync(request))
        {
            resultEvents.Add(evt);
        }

        // Assert
        _mockStrategyFactory.Verify(f => f.GetStrategy(request, _settings), Times.Once);
        mockStrategy.Verify(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()), Times.Once);
        resultEvents.Should().Contain(e => e.Content == "Hello");
        resultEvents.Should().Contain(e => e.Content == " World");
    }

    [Fact]
    public async Task ProcessStreamAsync_PassesCorrectContextToStrategy()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "openai",
            Model = "gpt-4",
            UserId = "user-456",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Test" }
            }
        };

        AgentStreamingContext? capturedContext = null;
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Callback<AgentStreamingContext, CancellationToken>((ctx, _) => capturedContext = ctx)
            .Returns(new List<AgentStreamEvent> { new() { Type = AgentEventType.End } }.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        await foreach (var _ in _sut.ProcessStreamAsync(request)) { }

        // Assert
        capturedContext.Should().NotBeNull();
        capturedContext!.Request.Should().BeSameAs(request);
        capturedContext.Settings.Should().BeSameAs(_settings);
        capturedContext.RagSettings.Should().BeSameAs(_ragSettings);
        capturedContext.Plugins.Should().ContainKey("notes");
    }

    [Fact]
    public async Task ProcessStreamAsync_HandlesCapabilitiesInContext()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Create a note" }
            }
        };

        AgentStreamingContext? capturedContext = null;
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Callback<AgentStreamingContext, CancellationToken>((ctx, _) => capturedContext = ctx)
            .Returns(new List<AgentStreamEvent> { new() { Type = AgentEventType.End } }.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        await foreach (var _ in _sut.ProcessStreamAsync(request)) { }

        // Assert
        capturedContext.Should().NotBeNull();
        capturedContext!.Plugins.Should().NotBeEmpty();
        capturedContext.Plugins.Should().ContainKey("notes");
    }

    #endregion

    #region ProcessAsync Tests

    [Fact]
    public async Task ProcessAsync_CollectsTokensIntoContent()
    {
        // Arrange
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

        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        var events = new List<AgentStreamEvent>
        {
            new() { Type = AgentEventType.Status, Content = "Starting" },
            new() { Type = AgentEventType.Token, Content = "Hello" },
            new() { Type = AgentEventType.Token, Content = " " },
            new() { Type = AgentEventType.Token, Content = "World" },
            new() { Type = AgentEventType.End, Content = "Hello World" }
        };
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Returns(events.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        var response = await _sut.ProcessAsync(request);

        // Assert
        response.Content.Should().Be("Hello World");
    }

    [Fact]
    public async Task ProcessAsync_CollectsToolCalls()
    {
        // Arrange
        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Capabilities = new List<string> { "notes" },
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Create a note" }
            }
        };

        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        var events = new List<AgentStreamEvent>
        {
            new() { Type = AgentEventType.ToolCallStart, ToolName = "create_note", ToolId = "tool-1" },
            new() { Type = AgentEventType.ToolCallEnd, ToolName = "create_note", ToolId = "tool-1", ToolResult = "Note created" },
            new() { Type = AgentEventType.Token, Content = "Done" },
            new() { Type = AgentEventType.End, Content = "Done" }
        };
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Returns(events.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        var response = await _sut.ProcessAsync(request);

        // Assert
        response.ToolCalls.Should().HaveCount(1);
        response.ToolCalls[0].ToolName.Should().Be("create_note");
        response.ToolCalls[0].Result.Should().Be("Note created");
    }

    [Fact]
    public async Task ProcessAsync_ThrowsOnError()
    {
        // Arrange
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

        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        var events = new List<AgentStreamEvent>
        {
            new() { Type = AgentEventType.Status, Content = "Starting" },
            new() { Type = AgentEventType.Error, Content = "Something went wrong" }
        };
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Returns(events.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act & Assert
        var act = async () => await _sut.ProcessAsync(request);
        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Something went wrong");
    }

    #endregion

    #region GetSystemPrompt Tests

    [Fact]
    public void GetSystemPrompt_WithCapabilities_IncludesPluginPrompts()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "notes" });

        // Assert
        prompt.Should().Contain("Notes");
    }

    [Fact]
    public void GetSystemPrompt_WithoutCapabilities_IncludesGeneralAssistantMode()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("General Assistant Mode");
    }

    [Fact]
    public void GetSystemPrompt_WithEmptyCapabilities_IncludesGeneralAssistantMode()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string>());

        // Assert
        prompt.Should().Contain("General Assistant Mode");
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
        prompt.Should().Contain("Reasoning Process");
        prompt.Should().Contain("<thinking>");
    }

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

    [Fact]
    public void GetSystemPrompt_ContainsIncrementalOperations()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("Incremental Operations");
        prompt.Should().Contain("Break into steps");
    }

    [Fact]
    public void GetSystemPrompt_ContainsResponseStyle()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(null);

        // Assert
        prompt.Should().Contain("Response Style");
        prompt.Should().Contain("concise");
    }

    [Fact]
    public void GetSystemPrompt_WithUnknownCapability_DoesNotThrow()
    {
        // Act
        var act = () => _sut.GetSystemPrompt(new List<string> { "unknown-capability" });

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void GetSystemPrompt_WithMixedCapabilities_IncludesKnownOnes()
    {
        // Act
        var prompt = _sut.GetSystemPrompt(new List<string> { "notes", "unknown" });

        // Assert
        prompt.Should().Contain("Notes");
    }

    #endregion

    #region Strategy Factory Integration Tests

    [Fact]
    public async Task ProcessStreamAsync_UsesCorrectProviderStrategy()
    {
        // Arrange
        var providers = new[] { "anthropic", "openai", "gemini", "ollama", "grok" };

        foreach (var provider in providers)
        {
            var request = new AgentRequest
            {
                Provider = provider,
                Model = "test-model",
                UserId = "user-123",
                Messages = new List<AgentMessage>
                {
                    new() { Role = "user", Content = "Test" }
                }
            };

            var mockStrategy = new Mock<IAgentStreamingStrategy>();
            mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
                .Returns(new List<AgentStreamEvent> { new() { Type = AgentEventType.End } }.ToAsyncEnumerable());

            _mockStrategyFactory.Setup(f => f.GetStrategy(
                    It.Is<AgentRequest>(r => r.Provider == provider),
                    It.IsAny<AIProvidersSettings>()))
                .Returns(mockStrategy.Object);

            // Act
            await foreach (var _ in _sut.ProcessStreamAsync(request)) { }

            // Assert
            _mockStrategyFactory.Verify(f => f.GetStrategy(
                It.Is<AgentRequest>(r => r.Provider == provider),
                _settings), Times.AtLeastOnce);
        }
    }

    [Fact]
    public async Task ProcessStreamAsync_PropagatesCancellation()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        var request = new AgentRequest
        {
            Provider = "anthropic",
            Model = "claude-3-opus",
            UserId = "user-123",
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "Test" }
            }
        };

        CancellationToken? capturedToken = null;
        var mockStrategy = new Mock<IAgentStreamingStrategy>();
        mockStrategy.Setup(s => s.ProcessAsync(It.IsAny<AgentStreamingContext>(), It.IsAny<CancellationToken>()))
            .Callback<AgentStreamingContext, CancellationToken>((ctx, ct) => capturedToken = ct)
            .Returns(new List<AgentStreamEvent>
            {
                new() { Type = AgentEventType.Status, Content = "Starting" },
                new() { Type = AgentEventType.End, Content = "Done" }
            }.ToAsyncEnumerable());

        _mockStrategyFactory.Setup(f => f.GetStrategy(It.IsAny<AgentRequest>(), It.IsAny<AIProvidersSettings>()))
            .Returns(mockStrategy.Object);

        // Act
        var events = new List<AgentStreamEvent>();
        await foreach (var evt in _sut.ProcessStreamAsync(request, cts.Token))
        {
            events.Add(evt);
        }

        // Assert - verify the cancellation token was passed through
        capturedToken.Should().NotBeNull();
        mockStrategy.Verify(s => s.ProcessAsync(
            It.IsAny<AgentStreamingContext>(),
            cts.Token), Times.Once);
    }

    #endregion
}

/// <summary>
/// Test plugin for testing purposes
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

/// <summary>
/// Extension methods for async enumerable in tests
/// </summary>
public static class AsyncEnumerableExtensions
{
    public static IAsyncEnumerable<T> ToAsyncEnumerable<T>(this IEnumerable<T> source)
    {
        return new AsyncEnumerableWrapper<T>(source);
    }

    private class AsyncEnumerableWrapper<T> : IAsyncEnumerable<T>
    {
        private readonly IEnumerable<T> _source;

        public AsyncEnumerableWrapper(IEnumerable<T> source)
        {
            _source = source;
        }

        public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        {
            return new AsyncEnumeratorWrapper<T>(_source.GetEnumerator());
        }
    }

    private class AsyncEnumeratorWrapper<T> : IAsyncEnumerator<T>
    {
        private readonly IEnumerator<T> _source;

        public AsyncEnumeratorWrapper(IEnumerator<T> source)
        {
            _source = source;
        }

        public T Current => _source.Current;

        public ValueTask<bool> MoveNextAsync()
        {
            return ValueTask.FromResult(_source.MoveNext());
        }

        public ValueTask DisposeAsync()
        {
            _source.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
