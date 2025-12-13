using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.GenerateChatCompletion;

public class GenerateChatCompletionCommandHandler : IRequestHandler<GenerateChatCompletionCommand, Result<AIResponse>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GenerateChatCompletionCommandHandler> _logger;

    public GenerateChatCompletionCommandHandler(
        IAIProviderFactory providerFactory,
        ILogger<GenerateChatCompletionCommandHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public async Task<Result<AIResponse>> Handle(GenerateChatCompletionCommand command, CancellationToken cancellationToken)
    {
        if (command.Request.Messages == null || !command.Request.Messages.Any())
        {
            return Result<AIResponse>.Failure(Error.Validation("Messages are required"));
        }

        try
        {
            var aiProvider = _providerFactory.GetProvider(command.Provider);

            if (!aiProvider.IsEnabled)
            {
                return Result<AIResponse>.Failure(Error.Validation($"Provider '{command.Provider}' is not enabled"));
            }

            var response = await aiProvider.GenerateChatCompletionAsync(
                command.Request.Messages,
                command.Request.Settings,
                cancellationToken);

            return Result<AIResponse>.Success(response);
        }
        catch (ArgumentException)
        {
            return Result<AIResponse>.Failure(Error.NotFound("Provider", command.Provider));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating chat completion with provider {Provider}", command.Provider);
            return Result<AIResponse>.Failure(Error.Custom("GenerationFailed", "Failed to generate chat completion"));
        }
    }
}
