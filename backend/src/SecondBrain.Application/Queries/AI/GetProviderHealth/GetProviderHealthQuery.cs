using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetProviderHealth;

public record GetProviderHealthQuery(
    string Provider,
    string? OllamaBaseUrl,
    bool UseRemoteOllama
) : IRequest<Result<AIProviderHealth>>;
