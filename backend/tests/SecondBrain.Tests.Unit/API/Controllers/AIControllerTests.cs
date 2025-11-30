using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class AIControllerTests
{
    private readonly Mock<IAIProviderFactory> _mockProviderFactory;
    private readonly Mock<ILogger<AIController>> _mockLogger;
    private readonly Mock<IAIProvider> _mockProvider;
    private readonly AIController _sut;

    public AIControllerTests()
    {
        _mockProviderFactory = new Mock<IAIProviderFactory>();
        _mockLogger = new Mock<ILogger<AIController>>();
        _mockProvider = new Mock<IAIProvider>();

        // OllamaProvider is only used for Ollama-specific endpoints (PullModel, DeleteModel)
        // which are not tested in these unit tests. Pass null for now.
        _sut = new AIController(
            _mockProviderFactory.Object,
            null!,
            _mockLogger.Object
        );
    }

    #region GetProviders Tests

    [Fact]
    public void GetProviders_ReturnsAllProviders()
    {
        // Arrange
        var providers = new List<IAIProvider>
        {
            CreateMockProvider("OpenAI", true),
            CreateMockProvider("Anthropic", true),
            CreateMockProvider("Ollama", false)
        };
        _mockProviderFactory.Setup(f => f.GetAllProviders()).Returns(providers);

        // Act
        var result = _sut.GetProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providerInfos = okResult.Value.Should().BeAssignableTo<IEnumerable<ProviderInfo>>().Subject;
        providerInfos.Should().HaveCount(3);
        providerInfos.Should().Contain(p => p.Name == "OpenAI" && p.IsEnabled);
        providerInfos.Should().Contain(p => p.Name == "Anthropic" && p.IsEnabled);
        providerInfos.Should().Contain(p => p.Name == "Ollama" && !p.IsEnabled);
    }

    [Fact]
    public void GetProviders_WhenException_Returns500()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Throws(new Exception("Provider error"));

        // Act
        var result = _sut.GetProviders();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetEnabledProviders Tests

    [Fact]
    public void GetEnabledProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var providers = new List<IAIProvider>
        {
            CreateMockProvider("OpenAI", true),
            CreateMockProvider("Anthropic", true)
        };
        _mockProviderFactory.Setup(f => f.GetEnabledProviders()).Returns(providers);

        // Act
        var result = _sut.GetEnabledProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providerInfos = okResult.Value.Should().BeAssignableTo<IEnumerable<ProviderInfo>>().Subject;
        providerInfos.Should().HaveCount(2);
        providerInfos.Should().OnlyContain(p => p.IsEnabled);
    }

    [Fact]
    public void GetEnabledProviders_WhenNoEnabledProviders_ReturnsEmptyList()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetEnabledProviders())
            .Returns(new List<IAIProvider>());

        // Act
        var result = _sut.GetEnabledProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providerInfos = okResult.Value.Should().BeAssignableTo<IEnumerable<ProviderInfo>>().Subject;
        providerInfos.Should().BeEmpty();
    }

    #endregion

    #region GetAllProvidersHealth Tests

    [Fact]
    public async Task GetAllProvidersHealth_ReturnsHealthForAllProviders()
    {
        // Arrange
        var openAiHealth = new AIProviderHealth
        {
            Provider = "OpenAI",
            IsHealthy = true,
            Status = "Healthy",
            CheckedAt = DateTime.UtcNow
        };
        var anthropicHealth = new AIProviderHealth
        {
            Provider = "Anthropic",
            IsHealthy = true,
            Status = "Healthy",
            CheckedAt = DateTime.UtcNow
        };

        var mockOpenAi = new Mock<IAIProvider>();
        mockOpenAi.Setup(p => p.ProviderName).Returns("OpenAI");
        mockOpenAi.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(openAiHealth);

        var mockAnthropic = new Mock<IAIProvider>();
        mockAnthropic.Setup(p => p.ProviderName).Returns("Anthropic");
        mockAnthropic.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(anthropicHealth);

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { mockOpenAi.Object, mockAnthropic.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        response.Providers.Should().HaveCount(2);
        response.Providers.Should().Contain(p => p.Provider == "OpenAI" && p.IsHealthy);
        response.Providers.Should().Contain(p => p.Provider == "Anthropic" && p.IsHealthy);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenProviderUnhealthy_IncludesErrorDetails()
    {
        // Arrange
        var unhealthyProvider = new Mock<IAIProvider>();
        unhealthyProvider.Setup(p => p.ProviderName).Returns("Ollama");
        unhealthyProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIProviderHealth
            {
                Provider = "Ollama",
                IsHealthy = false,
                Status = "Unreachable",
                ErrorMessage = "Connection refused"
            });

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { unhealthyProvider.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        var ollamaHealth = response.Providers.First(p => p.Provider == "Ollama");
        ollamaHealth.IsHealthy.Should().BeFalse();
        ollamaHealth.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenProviderThrowsException_ReturnsErrorStatus()
    {
        // Arrange
        var failingProvider = new Mock<IAIProvider>();
        failingProvider.Setup(p => p.ProviderName).Returns("FailingProvider");
        failingProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Health check failed"));

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { failingProvider.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        var failedHealth = response.Providers.First();
        failedHealth.IsHealthy.Should().BeFalse();
        failedHealth.Status.Should().Be("Error");
        failedHealth.ErrorMessage.Should().Be("Health check failed");
    }

    [Fact]
    public async Task GetAllProvidersHealth_WithRemoteOllamaUrl_PassesConfigOverrides()
    {
        // Arrange
        var ollamaProvider = new Mock<IAIProvider>();
        ollamaProvider.Setup(p => p.ProviderName).Returns("Ollama");
        ollamaProvider.Setup(p => p.GetHealthStatusAsync(
                It.Is<Dictionary<string, string>>(d => d.ContainsKey("ollamaBaseUrl")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIProviderHealth
            {
                Provider = "Ollama",
                IsHealthy = true,
                Status = "Healthy"
            });

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { ollamaProvider.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth(
            ollamaBaseUrl: "http://192.168.1.100:11434",
            useRemoteOllama: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ollamaProvider.Verify(p => p.GetHealthStatusAsync(
            It.Is<Dictionary<string, string>>(d => d["ollamaBaseUrl"] == "http://192.168.1.100:11434"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetProviderHealth Tests

    [Fact]
    public async Task GetProviderHealth_WhenProviderExists_ReturnsHealth()
    {
        // Arrange
        var health = new AIProviderHealth
        {
            Provider = "OpenAI",
            IsHealthy = true,
            Status = "Healthy",
            AvailableModels = new[] { "gpt-4", "gpt-3.5-turbo" }
        };

        _mockProvider.Setup(p => p.ProviderName).Returns("OpenAI");
        _mockProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(health);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GetProviderHealth("openai");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var healthResult = okResult.Value.Should().BeOfType<AIProviderHealth>().Subject;
        healthResult.Provider.Should().Be("OpenAI");
        healthResult.IsHealthy.Should().BeTrue();
        healthResult.AvailableModels.Should().Contain("gpt-4");
    }

    [Fact]
    public async Task GetProviderHealth_WhenProviderNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetProvider("unknown"))
            .Throws(new ArgumentException("Provider not found"));

        // Act
        var result = await _sut.GetProviderHealth("unknown");

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { error = "Provider 'unknown' not found" });
    }

    [Fact]
    public async Task GetProviderHealth_WhenException_Returns500()
    {
        // Arrange
        _mockProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Unexpected error"));
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GetProviderHealth("openai");

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GenerateCompletion Tests

    [Fact]
    public async Task GenerateCompletion_WhenValid_ReturnsResponse()
    {
        // Arrange
        var request = new AIRequest { Prompt = "Hello, AI!", Model = "gpt-4" };
        var response = new AIResponse
        {
            Content = "Hello! How can I help you?",
            Model = "gpt-4",
            Provider = "OpenAI",
            Success = true,
            TokensUsed = 15
        };

        _mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProvider.Setup(p => p.GenerateCompletionAsync(request, It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var aiResponse = okResult.Value.Should().BeOfType<AIResponse>().Subject;
        aiResponse.Content.Should().Be("Hello! How can I help you?");
        aiResponse.Success.Should().BeTrue();
    }

    [Fact]
    public async Task GenerateCompletion_WhenPromptEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new AIRequest { Prompt = "" };

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Prompt is required" });
    }

    [Fact]
    public async Task GenerateCompletion_WhenPromptWhitespace_ReturnsBadRequest()
    {
        // Arrange
        var request = new AIRequest { Prompt = "   " };

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateCompletion_WhenProviderNotFound_ReturnsNotFound()
    {
        // Arrange
        var request = new AIRequest { Prompt = "Test prompt" };
        _mockProviderFactory.Setup(f => f.GetProvider("unknown"))
            .Throws(new ArgumentException("Provider not found"));

        // Act
        var result = await _sut.GenerateCompletion("unknown", request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GenerateCompletion_WhenProviderDisabled_ReturnsBadRequest()
    {
        // Arrange
        var request = new AIRequest { Prompt = "Test prompt" };
        _mockProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Provider 'openai' is not enabled" });
    }

    #endregion

    #region GenerateChatCompletion Tests

    [Fact]
    public async Task GenerateChatCompletion_WhenValid_ReturnsResponse()
    {
        // Arrange
        var request = new ChatCompletionRequest
        {
            Messages = new List<ChatMessage>
            {
                new() { Role = "user", Content = "Hello!" }
            },
            Settings = new AIRequest { Model = "gpt-4" }
        };
        var response = new AIResponse
        {
            Content = "Hello! How can I assist you today?",
            Model = "gpt-4",
            Provider = "OpenAI",
            Success = true
        };

        _mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<AIRequest?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var aiResponse = okResult.Value.Should().BeOfType<AIResponse>().Subject;
        aiResponse.Content.Should().Be("Hello! How can I assist you today?");
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenMessagesNull_ReturnsBadRequest()
    {
        // Arrange
        var request = new ChatCompletionRequest { Messages = null! };

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Messages are required" });
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenMessagesEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new ChatCompletionRequest { Messages = new List<ChatMessage>() };

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenProviderNotFound_ReturnsNotFound()
    {
        // Arrange
        var request = new ChatCompletionRequest
        {
            Messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } }
        };
        _mockProviderFactory.Setup(f => f.GetProvider("invalid"))
            .Throws(new ArgumentException("Provider not found"));

        // Act
        var result = await _sut.GenerateChatCompletion("invalid", request);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenProviderDisabled_ReturnsBadRequest()
    {
        // Arrange
        var request = new ChatCompletionRequest
        {
            Messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } }
        };
        _mockProvider.Setup(p => p.IsEnabled).Returns(false);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenException_Returns500()
    {
        // Arrange
        var request = new ChatCompletionRequest
        {
            Messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } }
        };
        _mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProvider.Setup(p => p.GenerateChatCompletionAsync(
                It.IsAny<IEnumerable<ChatMessage>>(),
                It.IsAny<AIRequest?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API Error"));
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region Additional GetAllProvidersHealth Tests

    [Fact]
    public async Task GetAllProvidersHealth_WhenFactoryThrowsException_Returns500()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Throws(new Exception("Factory error"));

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenNoProviders_ReturnsEmptyList()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider>());

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        response.Providers.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllProvidersHealth_SetsCheckedAtTimestamp()
    {
        // Arrange
        var beforeCheck = DateTime.UtcNow.AddSeconds(-1);
        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider>());

        // Act
        var result = await _sut.GetAllProvidersHealth();
        var afterCheck = DateTime.UtcNow.AddSeconds(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        response.CheckedAt.Should().BeAfter(beforeCheck);
        response.CheckedAt.Should().BeBefore(afterCheck);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WithoutRemoteOllama_UsesRegularHealthCheck()
    {
        // Arrange
        var ollamaProvider = new Mock<IAIProvider>();
        ollamaProvider.Setup(p => p.ProviderName).Returns("Ollama");
        ollamaProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIProviderHealth { Provider = "Ollama", IsHealthy = true });

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { ollamaProvider.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth(useRemoteOllama: false);

        // Assert
        ollamaProvider.Verify(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()), Times.Once);
        ollamaProvider.Verify(p => p.GetHealthStatusAsync(
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenSocketException_ReturnsUnreachableStatus()
    {
        // Arrange
        var unreachableProvider = new Mock<IAIProvider>();
        unreachableProvider.Setup(p => p.ProviderName).Returns("Ollama");
        unreachableProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Connection refused", 
                new System.Net.Sockets.SocketException()));

        _mockProviderFactory.Setup(f => f.GetAllProviders())
            .Returns(new List<IAIProvider> { unreachableProvider.Object });

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        var health = response.Providers.First();
        health.IsHealthy.Should().BeFalse();
        health.Status.Should().Be("Unreachable");
    }

    #endregion

    #region Additional GetProviderHealth Tests

    [Fact]
    public async Task GetProviderHealth_WithRemoteOllama_PassesConfigOverrides()
    {
        // Arrange
        var ollamaProvider = new Mock<IAIProvider>();
        ollamaProvider.Setup(p => p.ProviderName).Returns("Ollama");
        ollamaProvider.Setup(p => p.GetHealthStatusAsync(
                It.Is<Dictionary<string, string>>(d => d.ContainsKey("ollamaBaseUrl")),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIProviderHealth { Provider = "Ollama", IsHealthy = true });

        _mockProviderFactory.Setup(f => f.GetProvider("ollama"))
            .Returns(ollamaProvider.Object);

        // Act
        var result = await _sut.GetProviderHealth("ollama", 
            ollamaBaseUrl: "http://remote:11434", 
            useRemoteOllama: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ollamaProvider.Verify(p => p.GetHealthStatusAsync(
            It.Is<Dictionary<string, string>>(d => d["ollamaBaseUrl"] == "http://remote:11434"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetProviderHealth_ForNonOllamaWithRemoteUrl_IgnoresRemoteUrl()
    {
        // Arrange
        var openAIProvider = new Mock<IAIProvider>();
        openAIProvider.Setup(p => p.ProviderName).Returns("OpenAI");
        openAIProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIProviderHealth { Provider = "OpenAI", IsHealthy = true });

        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(openAIProvider.Object);

        // Act
        var result = await _sut.GetProviderHealth("openai", 
            ollamaBaseUrl: "http://remote:11434", 
            useRemoteOllama: true);

        // Assert
        openAIProvider.Verify(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()), Times.Once);
        openAIProvider.Verify(p => p.GetHealthStatusAsync(
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProviderHealth_ReturnsAvailableModels()
    {
        // Arrange
        var health = new AIProviderHealth
        {
            Provider = "OpenAI",
            IsHealthy = true,
            AvailableModels = new[] { "gpt-4", "gpt-4o", "gpt-3.5-turbo" }
        };
        _mockProvider.Setup(p => p.ProviderName).Returns("OpenAI");
        _mockProvider.Setup(p => p.GetHealthStatusAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(health);
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GetProviderHealth("openai");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var healthResult = okResult.Value.Should().BeOfType<AIProviderHealth>().Subject;
        healthResult.AvailableModels.Should().HaveCount(3);
        healthResult.AvailableModels.Should().Contain("gpt-4o");
    }

    #endregion

    #region Additional GetEnabledProviders Tests

    [Fact]
    public void GetEnabledProviders_WhenException_Returns500()
    {
        // Arrange
        _mockProviderFactory.Setup(f => f.GetEnabledProviders())
            .Throws(new Exception("Factory error"));

        // Act
        var result = _sut.GetEnabledProviders();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region Additional GenerateCompletion Tests

    [Fact]
    public async Task GenerateCompletion_WhenException_Returns500()
    {
        // Arrange
        var request = new AIRequest { Prompt = "Test" };
        _mockProvider.Setup(p => p.IsEnabled).Returns(true);
        _mockProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API error"));
        _mockProviderFactory.Setup(f => f.GetProvider("openai"))
            .Returns(_mockProvider.Object);

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region Helper Methods

    private IAIProvider CreateMockProvider(string name, bool isEnabled)
    {
        var mock = new Mock<IAIProvider>();
        mock.Setup(p => p.ProviderName).Returns(name);
        mock.Setup(p => p.IsEnabled).Returns(isEnabled);
        return mock.Object;
    }

    #endregion
}

