using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Agents.Strategies;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Strategies;

/// <summary>
/// Tests for BaseAgentStreamingStrategy helper methods.
/// Uses a concrete test implementation to access protected methods.
/// </summary>
public class BaseAgentStreamingStrategyTests
{
    private readonly Mock<IToolExecutor> _mockToolExecutor;
    private readonly Mock<IThinkingExtractor> _mockThinkingExtractor;
    private readonly Mock<IPluginToolBuilder> _mockToolBuilder;
    private readonly Mock<IAgentRetryPolicy> _mockRetryPolicy;
    private readonly TestableAgentStreamingStrategy _sut;

    public BaseAgentStreamingStrategyTests()
    {
        _mockToolExecutor = new Mock<IToolExecutor>();
        _mockThinkingExtractor = new Mock<IThinkingExtractor>();
        _mockToolBuilder = new Mock<IPluginToolBuilder>();
        _mockRetryPolicy = new Mock<IAgentRetryPolicy>();

        _sut = new TestableAgentStreamingStrategy(
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockToolBuilder.Object,
            _mockRetryPolicy.Object);
    }

    #region Event Helper Tests

    [Fact]
    public void StatusEvent_CreatesCorrectEventType()
    {
        // Act
        var result = _sut.TestStatusEvent("Processing...");

        // Assert
        result.Type.Should().Be(AgentEventType.Status);
        result.Content.Should().Be("Processing...");
    }

    [Fact]
    public void TokenEvent_CreatesCorrectEventType()
    {
        // Act
        var result = _sut.TestTokenEvent("Hello world");

        // Assert
        result.Type.Should().Be(AgentEventType.Token);
        result.Content.Should().Be("Hello world");
    }

    [Fact]
    public void ErrorEvent_CreatesCorrectEventType()
    {
        // Act
        var result = _sut.TestErrorEvent("Something went wrong");

        // Assert
        result.Type.Should().Be(AgentEventType.Error);
        result.Content.Should().Be("Something went wrong");
    }

    [Fact]
    public void EndEvent_CreatesCorrectEventType()
    {
        // Act
        var result = _sut.TestEndEvent("Final response");

        // Assert
        result.Type.Should().Be(AgentEventType.End);
        result.Content.Should().Be("Final response");
    }

    [Fact]
    public void EndEventWithTokens_CalculatesTotalTokensCorrectly()
    {
        // Act
        var result = _sut.TestEndEventWithTokens(
            content: "Response",
            inputTokens: 100,
            outputTokens: 50,
            cachedTokens: 10,
            reasoningTokens: 25);

        // Assert
        result.Type.Should().Be(AgentEventType.End);
        result.Content.Should().Be("Response");
        result.InputTokens.Should().Be(100);
        result.OutputTokens.Should().Be(50);
        result.CachedTokens.Should().Be(10);
        result.ReasoningTokens.Should().Be(25);
        result.TotalTokens.Should().Be(175); // 100 + 50 + 25 (cached not included in total)
    }

    [Fact]
    public void EndEventWithTokens_HandlesNullValues()
    {
        // Act
        var result = _sut.TestEndEventWithTokens(
            content: "Response",
            inputTokens: null,
            outputTokens: null,
            cachedTokens: null,
            reasoningTokens: null);

        // Assert
        result.TotalTokens.Should().Be(0);
        result.InputTokens.Should().BeNull();
        result.OutputTokens.Should().BeNull();
    }

    [Fact]
    public void ThinkingEvent_CreatesCorrectEventType()
    {
        // Act
        var result = _sut.TestThinkingEvent("Let me think about this...");

        // Assert
        result.Type.Should().Be(AgentEventType.Thinking);
        result.Content.Should().Be("Let me think about this...");
    }

    [Fact]
    public void ToolCallStartEvent_CreatesCorrectEventWithAllFields()
    {
        // Act
        var result = _sut.TestToolCallStartEvent("CreateNote", "tool-123", "{\"title\":\"Test\"}");

        // Assert
        result.Type.Should().Be(AgentEventType.ToolCallStart);
        result.ToolName.Should().Be("CreateNote");
        result.ToolId.Should().Be("tool-123");
        result.ToolArguments.Should().Be("{\"title\":\"Test\"}");
    }

    [Fact]
    public void ToolCallEndEvent_CreatesCorrectEventWithAllFields()
    {
        // Act
        var result = _sut.TestToolCallEndEvent("CreateNote", "tool-123", "Note created successfully");

        // Assert
        result.Type.Should().Be(AgentEventType.ToolCallEnd);
        result.ToolName.Should().Be("CreateNote");
        result.ToolId.Should().Be("tool-123");
        result.ToolResult.Should().Be("Note created successfully");
    }

    [Fact]
    public void ContextRetrievalEvent_CreatesCorrectEventWithNotes()
    {
        // Arrange
        var notes = new List<RetrievedNoteContext>
        {
            new() { NoteId = "note-1", Title = "First Note", SimilarityScore = 0.9f },
            new() { NoteId = "note-2", Title = "Second Note", SimilarityScore = 0.8f }
        };

        // Act
        var result = _sut.TestContextRetrievalEvent(2, notes, "rag-log-123");

        // Assert
        result.Type.Should().Be(AgentEventType.ContextRetrieval);
        result.Content.Should().Be("Found 2 relevant note(s)");
        result.RetrievedNotes.Should().HaveCount(2);
        result.RagLogId.Should().Be("rag-log-123");
    }

    #endregion

    #region Message Helper Tests

    [Fact]
    public void GetLastUserMessage_ReturnsLastUserMessage()
    {
        // Arrange
        var request = new AgentRequest
        {
            Messages = new List<AgentMessage>
            {
                new() { Role = "user", Content = "First message" },
                new() { Role = "assistant", Content = "Response" },
                new() { Role = "user", Content = "Second message" }
            }
        };

        // Act
        var result = _sut.TestGetLastUserMessage(request);

        // Assert
        result.Should().Be("Second message");
    }

    [Fact]
    public void GetLastUserMessage_WhenNoUserMessage_ReturnsNull()
    {
        // Arrange
        var request = new AgentRequest
        {
            Messages = new List<AgentMessage>
            {
                new() { Role = "assistant", Content = "Response" }
            }
        };

        // Act
        var result = _sut.TestGetLastUserMessage(request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetLastUserMessage_IsCaseInsensitive()
    {
        // Arrange
        var request = new AgentRequest
        {
            Messages = new List<AgentMessage>
            {
                new() { Role = "USER", Content = "Uppercase role" }
            }
        };

        // Act
        var result = _sut.TestGetLastUserMessage(request);

        // Assert
        result.Should().Be("Uppercase role");
    }

    [Fact]
    public void CleanContentForNote_RemovesThinkingBlocks()
    {
        // Arrange
        var content = "<thinking>Let me think about this...</thinking>Actual content here";

        // Act
        var result = _sut.TestCleanContentForNote(content);

        // Assert
        result.Should().Be("Actual content here");
    }

    [Fact]
    public void CleanContentForNote_RemovesConversationalPrefixes()
    {
        // Arrange
        var content = "I'll create a note for you. Here is the actual content.";

        // Act
        var result = _sut.TestCleanContentForNote(content);

        // Assert
        result.Should().NotStartWith("I'll create");
    }

    [Fact]
    public void CleanContentForNote_HandlesEmptyContent()
    {
        // Act
        var result = _sut.TestCleanContentForNote("");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void CleanContentForNote_HandlesWhitespaceContent()
    {
        // Act
        var result = _sut.TestCleanContentForNote("   ");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region Error Categorization Tests

    [Fact]
    public void CategorizedErrorEvent_IdentifiesRateLimitError()
    {
        // Arrange
        var exception = new RateLimitException("Too many requests");

        // Act
        var result = _sut.TestCategorizedErrorEvent(exception, "API call");

        // Assert
        result.Type.Should().Be(AgentEventType.Error);
        result.Content.Should().Contain("[rate_limit]");
        result.ToolName.Should().Be("retriable");
    }

    [Fact]
    public void CategorizedErrorEvent_IdentifiesTimeoutError()
    {
        // Arrange
        var exception = new TimeoutException("Request timed out");

        // Act
        var result = _sut.TestCategorizedErrorEvent(exception, "API call");

        // Assert
        result.Content.Should().Contain("[timeout]");
        result.ToolName.Should().Be("retriable");
    }

    [Fact]
    public void CategorizedErrorEvent_IdentifiesAuthError()
    {
        // Arrange
        var exception = new HttpRequestException("401 Unauthorized");

        // Act
        var result = _sut.TestCategorizedErrorEvent(exception, "API call");

        // Assert
        result.Content.Should().Contain("[auth_error]");
        result.ToolName.Should().Be("non_retriable");
    }

    [Fact]
    public void CategorizedErrorEvent_IdentifiesCancelledError()
    {
        // Arrange
        var exception = new TaskCanceledException("Operation cancelled");

        // Act
        var result = _sut.TestCategorizedErrorEvent(exception, "API call");

        // Assert
        result.Content.Should().Contain("[cancelled]");
    }

    [Fact]
    public void CategorizedErrorEvent_IdentifiesUnknownError()
    {
        // Arrange
        var exception = new InvalidOperationException("Something unexpected");

        // Act
        var result = _sut.TestCategorizedErrorEvent(exception, "API call");

        // Assert
        result.Content.Should().Contain("[unknown]");
        result.ToolName.Should().Be("non_retriable");
    }

    [Fact]
    public void IsRetriableError_ReturnsTrueForRateLimitException()
    {
        // Act
        var result = _sut.TestIsRetriableError(new RateLimitException("Too many requests"));

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriableError_ReturnsTrueForTransientApiException()
    {
        // Act
        var result = _sut.TestIsRetriableError(new TransientApiException("Temporary failure"));

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriableError_ReturnsFalseForGenericException()
    {
        // Act
        var result = _sut.TestIsRetriableError(new InvalidOperationException("Not retriable"));

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Retry Helper Tests

    [Fact]
    public async Task WithRetryAsync_WhenNoRetryPolicy_ExecutesDirectly()
    {
        // Arrange
        var strategyWithoutPolicy = new TestableAgentStreamingStrategy(
            _mockToolExecutor.Object,
            _mockThinkingExtractor.Object,
            _mockToolBuilder.Object,
            retryPolicy: null);

        var mockLogger = new Mock<ILogger>();
        var operationCalled = false;

        // Act
        var result = await strategyWithoutPolicy.TestWithRetryAsync(
            async () =>
            {
                operationCalled = true;
                return await Task.FromResult(42);
            },
            mockLogger.Object,
            "TestOperation");

        // Assert
        operationCalled.Should().BeTrue();
        result.Should().Be(42);
    }

    [Fact]
    public async Task WithRetryAsync_WhenRetryPolicyExists_UsesPolicy()
    {
        // Arrange
        var mockLogger = new Mock<ILogger>();
        _mockRetryPolicy
            .Setup(p => p.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<int>>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);

        // Act
        var result = await _sut.TestWithRetryAsync(
            async () => await Task.FromResult(0), // This won't be called directly
            mockLogger.Object,
            "TestOperation");

        // Assert
        result.Should().Be(42);
        _mockRetryPolicy.Verify(
            p => p.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<int>>>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region SupportedProviders Tests

    [Fact]
    public void SupportedProviders_ReturnsTestProviders()
    {
        // Act
        var result = _sut.SupportedProviders;

        // Assert
        result.Should().Contain("test");
    }

    [Fact]
    public void CanHandle_ReturnsTrueForTestProvider()
    {
        // Arrange
        var request = new AgentRequest { Provider = "test" };
        var settings = new AIProvidersSettings();

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_ReturnsFalseForUnknownProvider()
    {
        // Arrange
        var request = new AgentRequest { Provider = "unknown" };
        var settings = new AIProvidersSettings();

        // Act
        var result = _sut.CanHandle(request, settings);

        // Assert
        result.Should().BeFalse();
    }

    #endregion
}

/// <summary>
/// Testable implementation that exposes protected methods for testing.
/// </summary>
public class TestableAgentStreamingStrategy : BaseAgentStreamingStrategy
{
    public TestableAgentStreamingStrategy(
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy? retryPolicy = null)
        : base(toolExecutor, thinkingExtractor, toolBuilder, retryPolicy)
    {
    }

    public override IReadOnlyList<string> SupportedProviders => new[] { "test" };

    public override bool CanHandle(AgentRequest request, AIProvidersSettings settings)
        => SupportedProviders.Contains(request.Provider, StringComparer.OrdinalIgnoreCase);

    public override async IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        yield return StatusEvent("Test processing");
        await Task.CompletedTask;
    }

    // Expose protected static methods for testing
    public AgentStreamEvent TestStatusEvent(string content) => StatusEvent(content);
    public AgentStreamEvent TestTokenEvent(string content) => TokenEvent(content);
    public AgentStreamEvent TestErrorEvent(string content) => ErrorEvent(content);
    public AgentStreamEvent TestEndEvent(string content) => EndEvent(content);
    public AgentStreamEvent TestEndEventWithTokens(string content, int? inputTokens, int? outputTokens, int? cachedTokens, int? reasoningTokens)
        => EndEventWithTokens(content, inputTokens, outputTokens, cachedTokens, reasoningTokens);
    public AgentStreamEvent TestThinkingEvent(string content) => ThinkingEvent(content);
    public AgentStreamEvent TestToolCallStartEvent(string toolName, string toolId, string arguments)
        => ToolCallStartEvent(toolName, toolId, arguments);
    public AgentStreamEvent TestToolCallEndEvent(string toolName, string toolId, string result)
        => ToolCallEndEvent(toolName, toolId, result);
    public AgentStreamEvent TestContextRetrievalEvent(int noteCount, List<RetrievedNoteContext> notes, string? ragLogId)
        => ContextRetrievalEvent(noteCount, notes, ragLogId);
    public string? TestGetLastUserMessage(AgentRequest request) => GetLastUserMessage(request);
    public string TestCleanContentForNote(string text) => CleanContentForNote(text);
    public AgentStreamEvent TestCategorizedErrorEvent(Exception exception, string context)
        => CategorizedErrorEvent(exception, context);
    public bool TestIsRetriableError(Exception exception) => IsRetriableError(exception);

    public Task<T> TestWithRetryAsync<T>(Func<Task<T>> operation, ILogger logger, string operationName)
        => WithRetryAsync(operation, logger, operationName);
}
