using MediatR;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.AI.GenerateChatCompletion;

public record GenerateChatCompletionCommand(
    string Provider,
    ChatCompletionRequest Request
) : IRequest<Result<AIResponse>>;
