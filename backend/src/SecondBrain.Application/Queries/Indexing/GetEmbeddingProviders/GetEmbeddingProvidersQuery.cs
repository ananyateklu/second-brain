using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Indexing.GetEmbeddingProviders;

/// <summary>
/// Query to get all available embedding providers and their models
/// </summary>
public record GetEmbeddingProvidersQuery : IRequest<Result<List<EmbeddingProviderResponse>>>;
