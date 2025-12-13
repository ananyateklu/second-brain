using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetProviders;

public record GetProvidersQuery() : IRequest<Result<IEnumerable<ProviderInfo>>>;
