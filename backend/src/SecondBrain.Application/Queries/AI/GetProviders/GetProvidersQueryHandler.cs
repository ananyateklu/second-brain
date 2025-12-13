using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetProviders;

public class GetProvidersQueryHandler : IRequestHandler<GetProvidersQuery, Result<IEnumerable<ProviderInfo>>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GetProvidersQueryHandler> _logger;

    public GetProvidersQueryHandler(
        IAIProviderFactory providerFactory,
        ILogger<GetProvidersQueryHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public Task<Result<IEnumerable<ProviderInfo>>> Handle(GetProvidersQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var providers = _providerFactory.GetAllProviders();
            var providerInfos = providers.Select(p => new ProviderInfo
            {
                Name = p.ProviderName,
                IsEnabled = p.IsEnabled
            });

            return Task.FromResult(Result<IEnumerable<ProviderInfo>>.Success(providerInfos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing AI providers");
            return Task.FromResult(Result<IEnumerable<ProviderInfo>>.Failure(
                Error.Custom("ListProvidersFailed", "Failed to list AI providers")));
        }
    }
}
