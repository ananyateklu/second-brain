using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.DeleteOllamaModel;

public record DeleteOllamaModelCommand(
    string ModelName,
    string? OllamaBaseUrl
) : IRequest<Result<string>>;
