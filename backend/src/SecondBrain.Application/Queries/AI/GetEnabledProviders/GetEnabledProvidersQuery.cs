using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetEnabledProviders;

public record GetEnabledProvidersQuery() : IRequest<Result<IEnumerable<ProviderInfo>>>;
