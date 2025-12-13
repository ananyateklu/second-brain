using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Indexing.GetEmbeddingProviders;

/// <summary>
/// Handler for GetEmbeddingProvidersQuery
/// </summary>
public class GetEmbeddingProvidersQueryHandler : IRequestHandler<GetEmbeddingProvidersQuery, Result<List<EmbeddingProviderResponse>>>
{
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly ILogger<GetEmbeddingProvidersQueryHandler> _logger;

    public GetEmbeddingProvidersQueryHandler(
        IEmbeddingProviderFactory embeddingProviderFactory,
        ILogger<GetEmbeddingProvidersQueryHandler> logger)
    {
        _embeddingProviderFactory = embeddingProviderFactory;
        _logger = logger;
    }

    public async Task<Result<List<EmbeddingProviderResponse>>> Handle(
        GetEmbeddingProvidersQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting embedding providers");

        try
        {
            var providers = _embeddingProviderFactory.GetAllProviders();
            var response = new List<EmbeddingProviderResponse>();

            foreach (var provider in providers)
            {
                // Fetch available models asynchronously from each provider
                var models = await provider.GetAvailableModelsAsync(cancellationToken);

                response.Add(new EmbeddingProviderResponse
                {
                    Name = provider.ProviderName,
                    IsEnabled = provider.IsEnabled,
                    CurrentModel = provider.ModelName,
                    CurrentDimensions = provider.Dimensions,
                    AvailableModels = models.Select(m => new EmbeddingModelResponse
                    {
                        ModelId = m.ModelId,
                        DisplayName = m.DisplayName,
                        Dimensions = m.Dimensions,
                        SupportsPinecone = m.SupportsPinecone,
                        Description = m.Description,
                        IsDefault = m.IsDefault
                    }).ToList()
                });
            }

            return Result<List<EmbeddingProviderResponse>>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting embedding providers");
            return Result<List<EmbeddingProviderResponse>>.Failure(Error.Internal("Failed to get embedding providers"));
        }
    }
}
