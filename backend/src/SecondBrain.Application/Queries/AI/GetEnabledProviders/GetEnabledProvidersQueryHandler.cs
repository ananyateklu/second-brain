using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.AI.GetEnabledProviders;

public class GetEnabledProvidersQueryHandler : IRequestHandler<GetEnabledProvidersQuery, Result<IEnumerable<ProviderInfo>>>
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly ILogger<GetEnabledProvidersQueryHandler> _logger;

    public GetEnabledProvidersQueryHandler(
        IAIProviderFactory providerFactory,
        ILogger<GetEnabledProvidersQueryHandler> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public Task<Result<IEnumerable<ProviderInfo>>> Handle(GetEnabledProvidersQuery request, CancellationToken cancellationToken)
    {
        try
        {
            var providers = _providerFactory.GetEnabledProviders();
            var providerInfos = providers.Select(p => new ProviderInfo
            {
                Name = p.ProviderName,
                IsEnabled = p.IsEnabled
            });

            return Task.FromResult(Result<IEnumerable<ProviderInfo>>.Success(providerInfos));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing enabled AI providers");
            return Task.FromResult(Result<IEnumerable<ProviderInfo>>.Failure(
                Error.Custom("ListEnabledProvidersFailed", "Failed to list enabled AI providers")));
        }
    }
}
