using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetAllProvidersHealth;

public record GetAllProvidersHealthQuery(
    string? OllamaBaseUrl,
    bool UseRemoteOllama
) : IRequest<Result<AIHealthResponse>>;
