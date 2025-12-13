using MediatR;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.GenerateCompletion;

public record GenerateCompletionCommand(
    string Provider,
    AIRequest Request
) : IRequest<Result<AIResponse>>;
