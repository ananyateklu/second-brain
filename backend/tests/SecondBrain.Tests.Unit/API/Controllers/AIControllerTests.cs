using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.AI.DeleteOllamaModel;
using SecondBrain.Application.Commands.AI.GenerateChatCompletion;
using SecondBrain.Application.Commands.AI.GenerateCompletion;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.AI.GetAllProvidersHealth;
using SecondBrain.Application.Queries.AI.GetEnabledProviders;
using SecondBrain.Application.Queries.AI.GetProviderHealth;
using SecondBrain.Application.Queries.AI.GetProviders;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class AIControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly Mock<ILogger<AIController>> _mockLogger;
    private readonly AIController _sut;

    public AIControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _mockLogger = new Mock<ILogger<AIController>>();

        // OllamaProvider is only used for Ollama-specific streaming endpoint (PullModel)
        // which is not tested in these unit tests. Pass null for now.
        _sut = new AIController(
            _mockMediator.Object,
            null!,
            _mockLogger.Object
        );
    }

    #region GetProviders Tests

    [Fact]
    public async Task GetProviders_ReturnsAllProviders()
    {
        // Arrange
        var providers = new List<ProviderInfo>
        {
            new() { Name = "OpenAI", IsEnabled = true },
            new() { Name = "Anthropic", IsEnabled = true },
            new() { Name = "Ollama", IsEnabled = false }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<ProviderInfo>>.Success(providers));

        // Act
        var result = await _sut.GetProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providerInfos = okResult.Value.Should().BeAssignableTo<IEnumerable<ProviderInfo>>().Subject;
        providerInfos.Should().HaveCount(3);
        providerInfos.Should().Contain(p => p.Name == "OpenAI" && p.IsEnabled);
        providerInfos.Should().Contain(p => p.Name == "Anthropic" && p.IsEnabled);
        providerInfos.Should().Contain(p => p.Name == "Ollama" && !p.IsEnabled);
    }

    [Fact]
    public async Task GetProviders_WhenError_Returns500()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<GetProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<ProviderInfo>>.Failure(Error.Custom("ListProvidersFailed", "Provider error")));

        // Act
        var result = await _sut.GetProviders();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetEnabledProviders Tests

    [Fact]
    public async Task GetEnabledProviders_ReturnsOnlyEnabledProviders()
    {
        // Arrange
        var providers = new List<ProviderInfo>
        {
            new() { Name = "OpenAI", IsEnabled = true },
            new() { Name = "Anthropic", IsEnabled = true }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GetEnabledProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<ProviderInfo>>.Success(providers));

        // Act
        var result = await _sut.GetEnabledProviders();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var providerInfos = okResult.Value.Should().BeAssignableTo<IEnumerable<ProviderInfo>>().Subject;
        providerInfos.Should().HaveCount(2);
        providerInfos.Should().OnlyContain(p => p.IsEnabled);
    }

    [Fact]
    public async Task GetEnabledProviders_WhenNoEnabledProviders_ReturnsEmptyList()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<GetEnabledProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<ProviderInfo>>.Success(new List<ProviderInfo>()));

        // Act
        var result = await _sut.GetEnabledProviders();

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
        var response = new AIHealthResponse
        {
            CheckedAt = DateTime.UtcNow,
            Providers = new List<AIProviderHealth>
            {
                new() { Provider = "OpenAI", IsHealthy = true, Status = "Healthy", CheckedAt = DateTime.UtcNow },
                new() { Provider = "Anthropic", IsHealthy = true, Status = "Healthy", CheckedAt = DateTime.UtcNow }
            }
        };

        _mockMediator.Setup(m => m.Send(It.IsAny<GetAllProvidersHealthQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIHealthResponse>.Success(response));

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var healthResponse = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        healthResponse.Providers.Should().HaveCount(2);
        healthResponse.Providers.Should().Contain(p => p.Provider == "OpenAI" && p.IsHealthy);
        healthResponse.Providers.Should().Contain(p => p.Provider == "Anthropic" && p.IsHealthy);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenProviderUnhealthy_IncludesErrorDetails()
    {
        // Arrange
        var response = new AIHealthResponse
        {
            CheckedAt = DateTime.UtcNow,
            Providers = new List<AIProviderHealth>
            {
                new() { Provider = "Ollama", IsHealthy = false, Status = "Unreachable", ErrorMessage = "Connection refused" }
            }
        };

        _mockMediator.Setup(m => m.Send(It.IsAny<GetAllProvidersHealthQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIHealthResponse>.Success(response));

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var healthResponse = okResult.Value.Should().BeOfType<AIHealthResponse>().Subject;
        var ollamaHealth = healthResponse.Providers.First(p => p.Provider == "Ollama");
        ollamaHealth.IsHealthy.Should().BeFalse();
        ollamaHealth.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetAllProvidersHealth_WithRemoteOllamaUrl_PassesParametersCorrectly()
    {
        // Arrange
        var response = new AIHealthResponse
        {
            CheckedAt = DateTime.UtcNow,
            Providers = new List<AIProviderHealth>
            {
                new() { Provider = "Ollama", IsHealthy = true, Status = "Healthy" }
            }
        };

        _mockMediator.Setup(m => m.Send(
                It.Is<GetAllProvidersHealthQuery>(q =>
                    q.OllamaBaseUrl == "http://192.168.1.100:11434" && q.UseRemoteOllama == true),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIHealthResponse>.Success(response));

        // Act
        var result = await _sut.GetAllProvidersHealth(
            ollamaBaseUrl: "http://192.168.1.100:11434",
            useRemoteOllama: true);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _mockMediator.Verify(m => m.Send(
            It.Is<GetAllProvidersHealthQuery>(q =>
                q.OllamaBaseUrl == "http://192.168.1.100:11434" && q.UseRemoteOllama == true),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAllProvidersHealth_WhenError_Returns500()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<GetAllProvidersHealthQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIHealthResponse>.Failure(Error.Custom("HealthCheckFailed", "Factory error")));

        // Act
        var result = await _sut.GetAllProvidersHealth();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
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

        _mockMediator.Setup(m => m.Send(
                It.Is<GetProviderHealthQuery>(q => q.Provider == "openai"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIProviderHealth>.Success(health));

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
        _mockMediator.Setup(m => m.Send(
                It.Is<GetProviderHealthQuery>(q => q.Provider == "unknown"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIProviderHealth>.Failure(Error.NotFound("Provider", "unknown")));

        // Act
        var result = await _sut.GetProviderHealth("unknown");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetProviderHealth_WhenError_Returns500()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(
                It.Is<GetProviderHealthQuery>(q => q.Provider == "openai"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIProviderHealth>.Failure(Error.Custom("HealthCheckFailed", "Unexpected error")));

        // Act
        var result = await _sut.GetProviderHealth("openai");

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetProviderHealth_WithRemoteOllama_PassesParametersCorrectly()
    {
        // Arrange
        var health = new AIProviderHealth { Provider = "Ollama", IsHealthy = true };
        _mockMediator.Setup(m => m.Send(
                It.Is<GetProviderHealthQuery>(q =>
                    q.Provider == "ollama" &&
                    q.OllamaBaseUrl == "http://remote:11434" &&
                    q.UseRemoteOllama == true),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIProviderHealth>.Success(health));

        // Act
        var result = await _sut.GetProviderHealth("ollama",
            ollamaBaseUrl: "http://remote:11434",
            useRemoteOllama: true);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _mockMediator.Verify(m => m.Send(
            It.Is<GetProviderHealthQuery>(q =>
                q.Provider == "ollama" &&
                q.OllamaBaseUrl == "http://remote:11434" &&
                q.UseRemoteOllama == true),
            It.IsAny<CancellationToken>()), Times.Once);
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

        _mockMediator.Setup(m => m.Send(
                It.Is<GenerateCompletionCommand>(c => c.Provider == "openai"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Success(response));

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
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Validation("Prompt is required")));

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
        _mockMediator.Setup(m => m.Send(
                It.Is<GenerateCompletionCommand>(c => c.Provider == "unknown"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.NotFound("Provider", "unknown")));

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
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Validation("Provider 'openai' is not enabled")));

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateCompletion_WhenError_Returns500()
    {
        // Arrange
        var request = new AIRequest { Prompt = "Test" };
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Custom("GenerationFailed", "API error")));

        // Act
        var result = await _sut.GenerateCompletion("openai", request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
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

        _mockMediator.Setup(m => m.Send(
                It.Is<GenerateChatCompletionCommand>(c => c.Provider == "openai"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Success(response));

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
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateChatCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Validation("Messages are required")));

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenMessagesEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new ChatCompletionRequest { Messages = new List<ChatMessage>() };
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateChatCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Validation("Messages are required")));

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
        _mockMediator.Setup(m => m.Send(
                It.Is<GenerateChatCompletionCommand>(c => c.Provider == "invalid"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.NotFound("Provider", "invalid")));

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
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateChatCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Validation("Provider 'openai' is not enabled")));

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GenerateChatCompletion_WhenError_Returns500()
    {
        // Arrange
        var request = new ChatCompletionRequest
        {
            Messages = new List<ChatMessage> { new() { Role = "user", Content = "Hi" } }
        };
        _mockMediator.Setup(m => m.Send(It.IsAny<GenerateChatCompletionCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AIResponse>.Failure(Error.Custom("GenerationFailed", "API Error")));

        // Act
        var result = await _sut.GenerateChatCompletion("openai", request);

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region DeleteOllamaModel Tests

    [Fact]
    public async Task DeleteOllamaModel_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(
                It.Is<DeleteOllamaModelCommand>(c => c.ModelName == "llama2"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<string>.Success("Model 'llama2' deleted successfully"));

        // Act
        var result = await _sut.DeleteOllamaModel("llama2");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task DeleteOllamaModel_WhenModelNameEmpty_ReturnsBadRequest()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<DeleteOllamaModelCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<string>.Failure(Error.Validation("Model name is required")));

        // Act
        var result = await _sut.DeleteOllamaModel("");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteOllamaModel_WhenError_Returns500()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<DeleteOllamaModelCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<string>.Failure(Error.Custom("DeleteFailed", "Failed to delete model")));

        // Act
        var result = await _sut.DeleteOllamaModel("llama2");

        // Assert
        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task DeleteOllamaModel_WithRemoteUrl_PassesParametersCorrectly()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(
                It.Is<DeleteOllamaModelCommand>(c =>
                    c.ModelName == "llama2" && c.OllamaBaseUrl == "http://remote:11434"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<string>.Success("Model deleted"));

        // Act
        var result = await _sut.DeleteOllamaModel("llama2", ollamaBaseUrl: "http://remote:11434");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockMediator.Verify(m => m.Send(
            It.Is<DeleteOllamaModelCommand>(c =>
                c.ModelName == "llama2" && c.OllamaBaseUrl == "http://remote:11434"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region GetEnabledProviders Error Tests

    [Fact]
    public async Task GetEnabledProviders_WhenError_Returns500()
    {
        // Arrange
        _mockMediator.Setup(m => m.Send(It.IsAny<GetEnabledProvidersQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<ProviderInfo>>.Failure(Error.Custom("ListEnabledProvidersFailed", "Factory error")));

        // Act
        var result = await _sut.GetEnabledProviders();

        // Assert
        var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(500);
    }

    #endregion
}
