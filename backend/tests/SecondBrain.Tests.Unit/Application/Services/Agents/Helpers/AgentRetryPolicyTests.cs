using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Services.Agents.Helpers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for AgentRetryPolicy.
/// Tests retry policy creation and exception classification.
/// </summary>
public class AgentRetryPolicyTests
{
    private readonly Mock<ILogger<AgentRetryPolicy>> _mockLogger;
    private readonly AgentRetryPolicy _sut;

    public AgentRetryPolicyTests()
    {
        _mockLogger = new Mock<ILogger<AgentRetryPolicy>>();
        _sut = new AgentRetryPolicy(_mockLogger.Object);
    }

    #region Defaults Tests

    [Fact]
    public void Defaults_HasExpectedMaxRetries()
    {
        // Assert
        AgentRetryPolicy.Defaults.MaxRetries.Should().Be(3);
    }

    [Fact]
    public void Defaults_HasExpectedInitialDelayMs()
    {
        // Assert
        AgentRetryPolicy.Defaults.InitialDelayMs.Should().Be(1000);
    }

    [Fact]
    public void Defaults_HasExpectedMaxDelayMs()
    {
        // Assert
        AgentRetryPolicy.Defaults.MaxDelayMs.Should().Be(60000);
    }

    [Fact]
    public void Defaults_HasExpectedJitterMaxMs()
    {
        // Assert
        AgentRetryPolicy.Defaults.JitterMaxMs.Should().Be(1000);
    }

    [Fact]
    public void Defaults_HasExpectedExponentialBase()
    {
        // Assert
        AgentRetryPolicy.Defaults.ExponentialBase.Should().Be(2.0);
    }

    #endregion

    #region CreateAsyncRetryPolicy Tests

    [Fact]
    public void CreateAsyncRetryPolicy_ReturnsNonNullPolicy()
    {
        // Act
        var policy = _sut.CreateAsyncRetryPolicy();

        // Assert
        policy.Should().NotBeNull();
    }

    [Fact]
    public void CreateAsyncRetryPolicy_WithCustomRetries_CreatesPolicy()
    {
        // Act
        var policy = _sut.CreateAsyncRetryPolicy(maxRetries: 5);

        // Assert
        policy.Should().NotBeNull();
    }

    [Fact]
    public void CreateAsyncRetryPolicy_WithCustomDelays_CreatesPolicy()
    {
        // Act
        var policy = _sut.CreateAsyncRetryPolicy(
            maxRetries: 3,
            initialDelayMs: 500,
            maxDelayMs: 30000);

        // Assert
        policy.Should().NotBeNull();
    }

    #endregion

    #region CreateRateLimitRetryPolicy Tests

    [Fact]
    public void CreateRateLimitRetryPolicy_ReturnsNonNullPolicy()
    {
        // Act
        var policy = _sut.CreateRateLimitRetryPolicy();

        // Assert
        policy.Should().NotBeNull();
    }

    [Fact]
    public void CreateRateLimitRetryPolicy_WithCustomMaxRetries_CreatesPolicy()
    {
        // Act
        var policy = _sut.CreateRateLimitRetryPolicy(maxRetries: 10);

        // Assert
        policy.Should().NotBeNull();
    }

    #endregion

    #region ExecuteWithRetryAsync Tests

    [Fact]
    public async Task ExecuteWithRetryAsync_WhenOperationSucceeds_ReturnsResult()
    {
        // Arrange
        var expected = "success";

        // Act
        var result = await _sut.ExecuteWithRetryAsync(() => Task.FromResult(expected));

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_WhenOperationSucceedsOnFirstTry_DoesNotRetry()
    {
        // Arrange
        var callCount = 0;

        // Act
        var result = await _sut.ExecuteWithRetryAsync(() =>
        {
            callCount++;
            return Task.FromResult("success");
        });

        // Assert
        callCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_WithCancellation_ThrowsCancelled()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(async () =>
            await _sut.ExecuteWithRetryAsync(
                () => Task.FromResult("success"),
                cancellationToken: cts.Token));
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_VoidVersion_ExecutesOperation()
    {
        // Arrange
        var executed = false;

        // Act
        await _sut.ExecuteWithRetryAsync(async () =>
        {
            await Task.Yield();
            executed = true;
        });

        // Assert
        executed.Should().BeTrue();
    }

    #endregion

    #region IsRetriable Tests

    [Fact]
    public void IsRetriable_WithTimeoutException_ReturnsTrue()
    {
        // Arrange
        var exception = new TimeoutException("timeout");

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriable_WithRateLimitException_ReturnsTrue()
    {
        // Arrange
        var exception = new RateLimitException("rate limited");

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriable_WithTransientApiException_ReturnsTrue()
    {
        // Arrange
        var exception = new TransientApiException("transient error");

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData(typeof(ArgumentException))]
    [InlineData(typeof(InvalidOperationException))]
    [InlineData(typeof(UnauthorizedAccessException))]
    [InlineData(typeof(NotSupportedException))]
    public void IsRetriable_WithNonRetriableException_ReturnsFalse(Type exceptionType)
    {
        // Arrange
        var exception = (Exception)Activator.CreateInstance(exceptionType, "test")!;

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsRetriable_WithTaskCanceledNotCanceled_ReturnsTrue()
    {
        // Arrange - TaskCanceledException with non-canceled token (timeout scenario)
        var exception = new TaskCanceledException("Timeout");

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriable_WithTaskCanceledActuallyCanceled_ReturnsFalse()
    {
        // Arrange - TaskCanceledException from actual cancellation
        var cts = new CancellationTokenSource();
        cts.Cancel();
        var exception = new TaskCanceledException("Cancelled", null, cts.Token);

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("429 Too Many Requests", true)]
    [InlineData("500 Internal Server Error", true)]
    [InlineData("502 Bad Gateway", true)]
    [InlineData("503 Service Unavailable", true)]
    [InlineData("504 Gateway Timeout", true)]
    [InlineData("rate limit exceeded", true)]
    [InlineData("connection timeout", true)]
    [InlineData("temporarily unavailable", true)]
    [InlineData("connection refused", true)]
    [InlineData("connection reset", true)]
    public void IsRetriable_WithRetriableHttpException_ReturnsTrue(string message, bool expected)
    {
        // Arrange
        var exception = new HttpRequestException(message);

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("400 Bad Request")]
    [InlineData("401 Unauthorized")]
    [InlineData("403 Forbidden")]
    [InlineData("404 Not Found")]
    [InlineData("422 Unprocessable Entity")]
    public void IsRetriable_WithNonRetriableHttpException_ReturnsFalse(string message)
    {
        // Arrange
        var exception = new HttpRequestException(message);

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsRetriable_WithNestedRetriableException_ReturnsTrue()
    {
        // Arrange
        var innerException = new TimeoutException("timeout");
        var outerException = new Exception("wrapper", innerException);

        // Act
        var result = AgentRetryPolicy.IsRetriable(outerException);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsRetriable_WithUnknownException_ReturnsFalse()
    {
        // Arrange
        var exception = new Exception("unknown error");

        // Act
        var result = AgentRetryPolicy.IsRetriable(exception);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region RateLimitException Tests

    [Fact]
    public void RateLimitException_WithRetryAfter_StoresValue()
    {
        // Arrange & Act
        var exception = new RateLimitException("rate limited", retryAfterSeconds: 30);

        // Assert
        exception.Message.Should().Be("rate limited");
        exception.RetryAfterSeconds.Should().Be(30);
    }

    [Fact]
    public void RateLimitException_WithoutRetryAfter_HasNullValue()
    {
        // Arrange & Act
        var exception = new RateLimitException("rate limited");

        // Assert
        exception.RetryAfterSeconds.Should().BeNull();
    }

    [Fact]
    public void RateLimitException_WithInnerException_StoresInner()
    {
        // Arrange
        var inner = new Exception("inner");

        // Act
        var exception = new RateLimitException("rate limited", inner, retryAfterSeconds: 60);

        // Assert
        exception.InnerException.Should().Be(inner);
        exception.RetryAfterSeconds.Should().Be(60);
    }

    #endregion

    #region TransientApiException Tests

    [Fact]
    public void TransientApiException_StoresMessage()
    {
        // Arrange & Act
        var exception = new TransientApiException("transient error");

        // Assert
        exception.Message.Should().Be("transient error");
    }

    [Fact]
    public void TransientApiException_WithInnerException_StoresInner()
    {
        // Arrange
        var inner = new Exception("inner");

        // Act
        var exception = new TransientApiException("transient error", inner);

        // Assert
        exception.InnerException.Should().Be(inner);
    }

    #endregion
}
