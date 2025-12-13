using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.GenerateCompletion;

public class GenerateCompletionCommandHandler : IRequestHandler<GenerateCompletionCommand, Result<AIResponse>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GenerateCompletionCommandHandler> _logger;

    public GenerateCompletionCommandHandler(
        IAIProviderFactory providerFactory,
        ILogger<GenerateCompletionCommandHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public async Task<Result<AIResponse>> Handle(GenerateCompletionCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.Request.Prompt))
        {
            return Result<AIResponse>.Failure(Error.Validation("Prompt is required"));
        }

        try
        {
            var aiProvider = _providerFactory.GetProvider(command.Provider);

            if (!aiProvider.IsEnabled)
            {
                return Result<AIResponse>.Failure(Error.Validation($"Provider '{command.Provider}' is not enabled"));
            }

            var response = await aiProvider.GenerateCompletionAsync(command.Request, cancellationToken);
            return Result<AIResponse>.Success(response);
        }
        catch (ArgumentException)
        {
            return Result<AIResponse>.Failure(Error.NotFound("Provider", command.Provider));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating completion with provider {Provider}", command.Provider);
            return Result<AIResponse>.Failure(Error.Custom("GenerationFailed", "Failed to generate completion"));
        }
    }
}
