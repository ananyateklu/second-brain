using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.DeleteOllamaModel;

public class DeleteOllamaModelCommandHandler : IRequestHandler<DeleteOllamaModelCommand, Result<string>>
{
    private readonly OllamaProvider _ollamaProvider;
    private readonly ILogger<DeleteOllamaModelCommandHandler> _logger;

    public DeleteOllamaModelCommandHandler(
        OllamaProvider ollamaProvider,
        ILogger<DeleteOllamaModelCommandHandler> logger)
    {
        _ollamaProvider = ollamaProvider;
        _logger = logger;
    }

    public async Task<Result<string>> Handle(DeleteOllamaModelCommand command, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(command.ModelName))
        {
            return Result<string>.Failure(Error.Validation("Model name is required"));
        }

        try
        {
            var (success, errorMessage) = await _ollamaProvider.DeleteModelAsync(
                command.ModelName,
                command.OllamaBaseUrl,
                cancellationToken);

            if (success)
            {
                return Result<string>.Success($"Model '{command.ModelName}' deleted successfully");
            }
            else
            {
                return Result<string>.Failure(Error.Validation(errorMessage ?? "Failed to delete model"));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Ollama model: {ModelName}", command.ModelName);
            return Result<string>.Failure(Error.Custom("DeleteFailed", "Failed to delete model"));
        }
    }
}
