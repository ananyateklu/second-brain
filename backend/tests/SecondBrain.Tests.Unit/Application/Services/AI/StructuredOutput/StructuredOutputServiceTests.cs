using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.StructuredOutput;

public class StructuredOutputServiceTests
{
    private readonly Mock<ILogger<StructuredOutputService>> _loggerMock;
    private readonly StructuredOutputSettings _settings;

    public StructuredOutputServiceTests()
    {
        _loggerMock = new Mock<ILogger<StructuredOutputService>>();
        _settings = new StructuredOutputSettings
        {
            DefaultProvider = "TestProvider",
            DefaultTemperature = 0.1f
        };
    }

    public class TestOutputType
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    [Fact]
    public void DefaultProvider_ReturnsConfiguredValue()
    {
        // Arrange
        var providers = new List<IProviderStructuredOutputService>();
        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var defaultProvider = service.DefaultProvider;

        // Assert
        Assert.Equal("TestProvider", defaultProvider);
    }

    [Fact]
    public void GetAvailableProviders_ReturnsOnlyAvailableProviders()
    {
        // Arrange
        var availableProvider = CreateMockProvider("Available", isAvailable: true);
        var unavailableProvider = CreateMockProvider("Unavailable", isAvailable: false);

        var providers = new List<IProviderStructuredOutputService>
        {
            availableProvider.Object,
            unavailableProvider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var available = service.GetAvailableProviders().ToList();

        // Assert
        Assert.Single(available);
        Assert.Contains("Available", available);
        Assert.DoesNotContain("Unavailable", available);
    }

    [Fact]
    public void IsProviderAvailable_ReturnsTrueForAvailableProvider()
    {
        // Arrange
        var availableProvider = CreateMockProvider("TestProvider", isAvailable: true);

        var providers = new List<IProviderStructuredOutputService>
        {
            availableProvider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var isAvailable = service.IsProviderAvailable("TestProvider");

        // Assert
        Assert.True(isAvailable);
    }

    [Fact]
    public void IsProviderAvailable_ReturnsFalseForUnavailableProvider()
    {
        // Arrange
        var unavailableProvider = CreateMockProvider("TestProvider", isAvailable: false);

        var providers = new List<IProviderStructuredOutputService>
        {
            unavailableProvider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var isAvailable = service.IsProviderAvailable("TestProvider");

        // Assert
        Assert.False(isAvailable);
    }

    [Fact]
    public void IsProviderAvailable_ReturnsFalseForNonExistentProvider()
    {
        // Arrange
        var providers = new List<IProviderStructuredOutputService>();

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var isAvailable = service.IsProviderAvailable("NonExistent");

        // Assert
        Assert.False(isAvailable);
    }

    [Fact]
    public void IsProviderAvailable_IsCaseInsensitive()
    {
        // Arrange
        var provider = CreateMockProvider("TestProvider", isAvailable: true);

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act & Assert
        Assert.True(service.IsProviderAvailable("testprovider"));
        Assert.True(service.IsProviderAvailable("TESTPROVIDER"));
        Assert.True(service.IsProviderAvailable("TestProvider"));
    }

    [Fact]
    public async Task GenerateAsync_ReturnsNullForNonExistentProvider()
    {
        // Arrange
        var providers = new List<IProviderStructuredOutputService>();

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var result = await service.GenerateAsync<TestOutputType>("NonExistent", "test prompt");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateAsync_ReturnsNullForUnavailableProvider()
    {
        // Arrange
        var provider = CreateMockProvider("TestProvider", isAvailable: false);

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var result = await service.GenerateAsync<TestOutputType>("TestProvider", "test prompt");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateAsync_CallsProviderWithCorrectParameters()
    {
        // Arrange
        var expectedResult = new TestOutputType { Title = "Test", Content = "Content" };
        var provider = CreateMockProvider("TestProvider", isAvailable: true, result: expectedResult);

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        var options = new StructuredOutputOptions
        {
            Model = "test-model",
            Temperature = 0.5f
        };

        // Act
        var result = await service.GenerateAsync<TestOutputType>("TestProvider", "test prompt", options);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedResult.Title, result.Title);
        Assert.Equal(expectedResult.Content, result.Content);

        provider.Verify(p => p.GenerateAsync<TestOutputType>(
            "test prompt",
            It.Is<StructuredOutputOptions>(o => o.Model == "test-model" && o.Temperature == 0.5f),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GenerateAsync_WithoutProvider_UsesDefaultProvider()
    {
        // Arrange
        var expectedResult = new TestOutputType { Title = "Test", Content = "Content" };
        var provider = CreateMockProvider("TestProvider", isAvailable: true, result: expectedResult);

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var result = await service.GenerateAsync<TestOutputType>("test prompt");

        // Assert
        Assert.NotNull(result);
        provider.Verify(p => p.GenerateAsync<TestOutputType>(
            "test prompt",
            It.IsAny<StructuredOutputOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GenerateAsync_ReturnsNullOnProviderFailure()
    {
        // Arrange
        var provider = CreateMockProvider("TestProvider", isAvailable: true, shouldFail: true);

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var result = await service.GenerateAsync<TestOutputType>("TestProvider", "test prompt");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateAsync_HandlesExceptionsGracefully()
    {
        // Arrange
        var provider = new Mock<IProviderStructuredOutputService>();
        provider.Setup(p => p.ProviderName).Returns("TestProvider");
        provider.Setup(p => p.IsAvailable).Returns(true);
        provider.Setup(p => p.GenerateAsync<TestOutputType>(
            It.IsAny<string>(),
            It.IsAny<StructuredOutputOptions>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Test exception"));

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        // Act
        var result = await service.GenerateAsync<TestOutputType>("TestProvider", "test prompt");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GenerateAsync_PropagatesCancellation()
    {
        // Arrange
        var provider = new Mock<IProviderStructuredOutputService>();
        provider.Setup(p => p.ProviderName).Returns("TestProvider");
        provider.Setup(p => p.IsAvailable).Returns(true);
        provider.Setup(p => p.GenerateAsync<TestOutputType>(
            It.IsAny<string>(),
            It.IsAny<StructuredOutputOptions>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        var providers = new List<IProviderStructuredOutputService>
        {
            provider.Object
        };

        var service = new StructuredOutputService(
            providers,
            Options.Create(_settings),
            _loggerMock.Object);

        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            service.GenerateAsync<TestOutputType>("TestProvider", "test prompt", null, cts.Token));
    }

    private static Mock<IProviderStructuredOutputService> CreateMockProvider(
        string name,
        bool isAvailable,
        TestOutputType? result = null,
        bool shouldFail = false)
    {
        var mock = new Mock<IProviderStructuredOutputService>();
        mock.Setup(p => p.ProviderName).Returns(name);
        mock.Setup(p => p.IsAvailable).Returns(isAvailable);

        if (!shouldFail && result != null)
        {
            mock.Setup(p => p.GenerateAsync<TestOutputType>(
                It.IsAny<string>(),
                It.IsAny<StructuredOutputOptions>(),
                It.IsAny<CancellationToken>()))
                .ReturnsAsync(new StructuredOutputResult<TestOutputType>
                {
                    Success = true,
                    Result = result,
                    Provider = name,
                    Model = "test-model"
                });
        }
        else if (shouldFail)
        {
            mock.Setup(p => p.GenerateAsync<TestOutputType>(
                It.IsAny<string>(),
                It.IsAny<StructuredOutputOptions>(),
                It.IsAny<CancellationToken>()))
                .ReturnsAsync(new StructuredOutputResult<TestOutputType>
                {
                    Success = false,
                    Error = "Test failure",
                    Provider = name,
                    Model = "test-model"
                });
        }

        return mock;
    }
}
