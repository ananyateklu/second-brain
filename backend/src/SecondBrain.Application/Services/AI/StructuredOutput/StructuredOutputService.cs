using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Unified structured output service that delegates to provider-specific implementations.
/// </summary>
public class StructuredOutputService : IStructuredOutputService
{
    private readonly ILogger<StructuredOutputService> _logger;
    private readonly StructuredOutputSettings _settings;
    private readonly Dictionary<string, IProviderStructuredOutputService> _providers;

    public StructuredOutputService(
        IEnumerable<IProviderStructuredOutputService> providers,
        IOptions<StructuredOutputSettings> settings,
        ILogger<StructuredOutputService> logger)
    {
        _logger = logger;
        _settings = settings.Value;

        // Build provider dictionary (case-insensitive)
        _providers = providers
            .ToDictionary(
                p => p.ProviderName,
                p => p,
                StringComparer.OrdinalIgnoreCase);

        _logger.LogDebug("Initialized StructuredOutputService with {Count} providers: {Providers}",
            _providers.Count, string.Join(", ", _providers.Keys));
    }

    /// <inheritdoc />
    public string DefaultProvider => _settings.DefaultProvider;

    /// <inheritdoc />
    public async Task<T?> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions? options = null,
        CancellationToken cancellationToken = default) where T : class
    {
        return await GenerateAsync<T>(DefaultProvider, prompt, options, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<T?> GenerateAsync<T>(
        string provider,
        string prompt,
        StructuredOutputOptions? options = null,
        CancellationToken cancellationToken = default) where T : class
    {
        if (!_providers.TryGetValue(provider, out var service))
        {
            _logger.LogError("Structured output provider '{Provider}' not found. Available providers: {Available}",
                provider, string.Join(", ", _providers.Keys));
            return null;
        }

        if (!service.IsAvailable)
        {
            _logger.LogWarning("Structured output provider '{Provider}' is not available", provider);
            return null;
        }

        var effectiveOptions = options ?? new StructuredOutputOptions();

        try
        {
            var result = await service.GenerateAsync<T>(prompt, effectiveOptions, cancellationToken);

            if (!result.Success)
            {
                _logger.LogWarning("Structured output generation failed for provider '{Provider}': {Error}",
                    provider, result.Error);
                return null;
            }

            return result.Result;
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("Structured output generation was cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from provider '{Provider}'", provider);
            return null;
        }
    }

    /// <inheritdoc />
    public IEnumerable<string> GetAvailableProviders()
    {
        return _providers
            .Where(p => p.Value.IsAvailable)
            .Select(p => p.Key);
    }

    /// <inheritdoc />
    public bool IsProviderAvailable(string provider)
    {
        return _providers.TryGetValue(provider, out var service) && service.IsAvailable;
    }
}
