using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.Sockets;
using System.Runtime.CompilerServices;

namespace SecondBrain.Application.Services.AI.Providers;

public class OllamaProvider : IAIProvider
{
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaProvider> _logger;
    private readonly OllamaApiClient? _defaultClient;
    private readonly ConcurrentDictionary<string, OllamaApiClient> _clientCache = new();

    public string ProviderName => "Ollama";
    public bool IsEnabled => _settings.Enabled;

    public OllamaProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<OllamaProvider> logger)
    {
        _settings = settings.Value.Ollama;
        _logger = logger;

        if (_settings.Enabled)
        {
            try
            {
                _defaultClient = new OllamaApiClient(new Uri(_settings.BaseUrl))
                {
                    SelectedModel = _settings.DefaultModel
                };
                // Cache the default client
                _clientCache[_settings.BaseUrl] = _defaultClient;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Ollama client");
            }
        }
    }

    /// <summary>
    /// Gets or creates an Ollama client for the specified base URL.
    /// Returns the default client if no override URL is specified.
    /// </summary>
    private OllamaApiClient? GetClientForUrl(string? overrideUrl)
    {
        // If no override, use default client
        if (string.IsNullOrWhiteSpace(overrideUrl))
        {
            return _defaultClient;
        }

        // Normalize URL
        var normalizedUrl = overrideUrl.TrimEnd('/');

        // Try to get from cache, or create new client
        return _clientCache.GetOrAdd(normalizedUrl, url =>
        {
            _logger.LogInformation("Creating new Ollama client for remote URL: {Url}", url);
            return new OllamaApiClient(new Uri(url))
            {
                SelectedModel = _settings.DefaultModel
            };
        });
    }

    /// <summary>
    /// Gets the effective base URL for error messages
    /// </summary>
    private string GetEffectiveBaseUrl(string? overrideUrl)
    {
        return string.IsNullOrWhiteSpace(overrideUrl) ? _settings.BaseUrl : overrideUrl.TrimEnd('/');
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(request.OllamaBaseUrl);
        var effectiveUrl = GetEffectiveBaseUrl(request.OllamaBaseUrl);

        if (!IsEnabled || client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Ollama provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var generateRequest = new GenerateRequest
            {
                Model = request.Model ?? _settings.DefaultModel,
                Prompt = request.Prompt,
                Stream = false,
                Options = new RequestOptions
                {
                    Temperature = request.Temperature ?? _settings.Temperature,
                    NumPredict = request.MaxTokens
                }
            };

            // Consume the async enumerable to get the final response
            GenerateResponseStream? response = null;
            await foreach (var stream in client.GenerateAsync(generateRequest, cancellationToken))
            {
                response = stream;
            }

            if (response == null)
            {
                throw new InvalidOperationException("No response from Ollama");
            }

            return new AIResponse
            {
                Success = true,
                Content = response.Response ?? string.Empty,
                Model = request.Model ?? _settings.DefaultModel,
                TokensUsed = 0, // Token counting not available in current OllamaSharp version
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Ollama completion failed - service unreachable (connection refused)");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating completion from Ollama");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(settings?.OllamaBaseUrl);
        var effectiveUrl = GetEffectiveBaseUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Ollama provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var chatMessages = messages.Select(m => ConvertToOllamaMessage(m)).ToList();

            var chatRequest = new ChatRequest
            {
                Model = settings?.Model ?? _settings.DefaultModel,
                Messages = chatMessages,
                Stream = false,
                Options = new RequestOptions
                {
                    Temperature = settings?.Temperature ?? _settings.Temperature,
                    NumPredict = settings?.MaxTokens
                }
            };

            // Consume the async enumerable to get the final response
            ChatResponseStream? response = null;
            await foreach (var stream in client.ChatAsync(chatRequest, cancellationToken))
            {
                response = stream;
            }

            if (response == null)
            {
                throw new InvalidOperationException("No response from Ollama");
            }

            return new AIResponse
            {
                Success = true,
                Content = response.Message?.Content ?? string.Empty,
                Model = settings?.Model ?? _settings.DefaultModel,
                TokensUsed = 0, // Token counting not available in current OllamaSharp version
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Ollama chat completion failed - service unreachable (connection refused)");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama chat completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama chat completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating chat completion from Ollama");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(request.OllamaBaseUrl);

        if (!IsEnabled || client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamCompletionInternalAsync(request, client, cancellationToken),
            "Ollama streaming"));
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        OllamaApiClient client,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var generateRequest = new GenerateRequest
        {
            Model = request.Model ?? _settings.DefaultModel,
            Prompt = request.Prompt,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = request.Temperature ?? _settings.Temperature,
                NumPredict = request.MaxTokens
            }
        };

        IAsyncEnumerable<GenerateResponseStream?>? stream = null;
        try
        {
            stream = client.GenerateAsync(generateRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Ollama streaming failed - service unreachable (connection refused)");
            yield break;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama streaming failed - service unreachable");
            yield break;
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama streaming failed - socket connection refused");
            yield break;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama streaming failed with unexpected error");
            yield break;
        }

        if (stream == null)
            yield break;

        await foreach (var chunk in stream)
        {
            if (!string.IsNullOrEmpty(chunk?.Response))
            {
                yield return chunk.Response;
            }
        }
    }

    public Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamChatCompletionInternalAsync(messages, settings, client, cancellationToken),
            "Ollama chat streaming"));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        OllamaApiClient client,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var chatMessages = messages.Select(m => ConvertToOllamaMessage(m)).ToList();

        var chatRequest = new ChatRequest
        {
            Model = settings?.Model ?? _settings.DefaultModel,
            Messages = chatMessages,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = settings?.Temperature ?? _settings.Temperature,
                NumPredict = settings?.MaxTokens
            }
        };

        IAsyncEnumerable<ChatResponseStream?>? stream = null;
        try
        {
            stream = client.ChatAsync(chatRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable (connection refused)");
            yield break;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable");
            yield break;
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama chat streaming failed - socket connection refused");
            yield break;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama chat streaming failed with unexpected error");
            yield break;
        }

        if (stream == null)
            yield break;

        await foreach (var chunk in stream)
        {
            if (!string.IsNullOrEmpty(chunk?.Message?.Content))
            {
                yield return chunk.Message.Content;
            }
        }
    }

    /// <summary>
    /// Convert a ChatMessage to Ollama format, handling multimodal content
    /// </summary>
    private static Message ConvertToOllamaMessage(Models.ChatMessage message)
    {
        var ollamaMessage = new Message
        {
            Role = message.Role.ToLower(),
            Content = message.Content
        };

        // Add images if present (Ollama uses 'images' array with base64 data)
        if (message.Images != null && message.Images.Count > 0)
        {
            ollamaMessage.Images = message.Images
                .Select(img => img.Base64Data)
                .ToArray();
        }

        return ollamaMessage;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _defaultClient == null)
            return false;

        try
        {
            var models = await _defaultClient.ListLocalModelsAsync(cancellationToken);
            return models != null && models.Any();
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogDebug("Ollama availability check failed - service unreachable at {BaseUrl} (connection refused)", _settings.BaseUrl);
            return false;
        }
        catch (HttpRequestException)
        {
            _logger.LogDebug("Ollama availability check failed - service unreachable at {BaseUrl}", _settings.BaseUrl);
            return false;
        }
        catch (SocketException)
        {
            _logger.LogDebug("Ollama availability check failed - socket connection refused at {BaseUrl}", _settings.BaseUrl);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ollama availability check failed with unexpected error");
            return false;
        }
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(
        CancellationToken cancellationToken = default)
    {
        return GetHealthStatusAsync(null, cancellationToken);
    }

    public async Task<AIProviderHealth> GetHealthStatusAsync(
        Dictionary<string, string>? configOverrides,
        CancellationToken cancellationToken = default)
    {
        // Check for remote URL override
        string? remoteUrl = null;
        if (configOverrides != null)
        {
            configOverrides.TryGetValue("ollamaBaseUrl", out remoteUrl);
        }

        var client = GetClientForUrl(remoteUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteUrl);

        var stopwatch = Stopwatch.StartNew();
        var health = new AIProviderHealth
        {
            Provider = ProviderName,
            CheckedAt = DateTime.UtcNow
        };

        if (!IsEnabled)
        {
            health.IsHealthy = false;
            health.Status = "Disabled";
            health.ErrorMessage = "Provider is disabled in configuration";
            return health;
        }

        if (client == null)
        {
            health.IsHealthy = false;
            health.Status = "Not Configured";
            health.ErrorMessage = "Ollama client not initialized";
            return health;
        }

        // Add timeout to prevent hanging (5 seconds)
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken, timeoutCts.Token);

        try
        {
            var models = await client.ListLocalModelsAsync(linkedCts.Token);
            stopwatch.Stop();

            var isHealthy = models != null && models.Any();

            health.IsHealthy = isHealthy;
            health.Status = isHealthy ? "Healthy" : "No Models Available";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.Version = "0.1.0";
            health.AvailableModels = models?.Select(m => m.Name) ?? Enumerable.Empty<string>();

            if (!isHealthy)
            {
                health.ErrorMessage = "No models installed. Run 'ollama pull <model-name>' to install a model.";
            }
        }
        catch (TaskCanceledException) when (timeoutCts.Token.IsCancellationRequested)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Connection to Ollama at {effectiveUrl} timed out. Ensure Ollama is running and accessible.";
            _logger.LogDebug("Ollama health check timed out at {BaseUrl} - service may be unreachable", effectiveUrl);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl} (connection refused)", effectiveUrl);
        }
        catch (HttpRequestException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl}", effectiveUrl);
        }
        catch (SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - socket connection refused at {BaseUrl}", effectiveUrl);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Ollama health check failed with unexpected error");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }

    private async IAsyncEnumerable<string> WrapStreamWithErrorHandling(
        IAsyncEnumerable<string> stream,
        string operationName)
    {
        var enumerator = stream.GetAsyncEnumerator();
        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    _logger.LogWarning(ex, "{Operation} failed - service unreachable (connection refused)", operationName);
                    break;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "{Operation} failed - service unreachable", operationName);
                    break;
                }
                catch (SocketException ex)
                {
                    _logger.LogWarning(ex, "{Operation} failed - socket connection refused", operationName);
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "{Operation} failed with unexpected error", operationName);
                    break;
                }

                if (!hasNext)
                    break;

                yield return enumerator.Current;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }
    }

    /// <summary>
    /// Pull (download) a model from the Ollama library to the local or remote Ollama instance.
    /// Returns an async enumerable of progress updates for real-time feedback.
    /// </summary>
    /// <param name="modelName">Name of the model to pull (e.g., "llama3:8b")</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of pull progress updates</returns>
    public async IAsyncEnumerable<OllamaPullProgress> PullModelAsync(
        string modelName,
        string? remoteOllamaUrl = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled)
        {
            yield return new OllamaPullProgress
            {
                Status = "Error",
                IsError = true,
                ErrorMessage = "Ollama provider is not enabled"
            };
            yield break;
        }

        if (client == null)
        {
            yield return new OllamaPullProgress
            {
                Status = "Error",
                IsError = true,
                ErrorMessage = "Ollama client not initialized"
            };
            yield break;
        }

        _logger.LogInformation("Starting model pull: {ModelName} from {Url}", modelName, effectiveUrl);

        // Track timing for speed calculation
        long lastCompletedBytes = 0;
        DateTime lastProgressTime = DateTime.UtcNow;

        // Get the pull stream - note: PullModelAsync doesn't throw on call, it throws on enumeration
        var pullStream = client.PullModelAsync(modelName, cancellationToken);

        // Use a separate enumerator to handle errors during enumeration
        var enumerator = pullStream.GetAsyncEnumerator(cancellationToken);
        OllamaPullProgress? errorProgress = null;
        
        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    _logger.LogWarning(ex, "Model pull failed - service unreachable at {Url}", effectiveUrl);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running."
                    };
                    break;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "Model pull failed - HTTP error at {Url}", effectiveUrl);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = $"HTTP error connecting to Ollama: {ex.Message}"
                    };
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Model pull failed for {ModelName}", modelName);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = ex.Message
                    };
                    break;
                }

                if (!hasNext)
                    break;

                var response = enumerator.Current;
                if (response == null) continue;

                var now = DateTime.UtcNow;
                var progress = new OllamaPullProgress
                {
                    Status = response.Status ?? "Unknown",
                    Digest = response.Digest,
                    TotalBytes = response.Total,
                    CompletedBytes = response.Completed,
                    Timestamp = now
                };

                // Calculate percentage
                if (response.Total > 0 && response.Completed > 0)
                {
                    progress.Percentage = (double)response.Completed / response.Total * 100;
                }

                // Calculate download speed (bytes per second)
                if (response.Completed > lastCompletedBytes)
                {
                    var timeDelta = (now - lastProgressTime).TotalSeconds;
                    if (timeDelta > 0.1) // Only calculate if enough time has passed
                    {
                        var bytesDelta = response.Completed - lastCompletedBytes;
                        progress.BytesPerSecond = bytesDelta / timeDelta;

                        // Calculate estimated time remaining
                        if (response.Total > 0 && progress.BytesPerSecond > 0)
                        {
                            var remainingBytes = response.Total - response.Completed;
                            progress.EstimatedSecondsRemaining = remainingBytes / progress.BytesPerSecond;
                        }

                        lastCompletedBytes = response.Completed;
                        lastProgressTime = now;
                    }
                }

                // Check if this is the final success message
                if (response.Status?.Equals("success", StringComparison.OrdinalIgnoreCase) == true)
                {
                    progress.IsComplete = true;
                    _logger.LogInformation("Model pull completed: {ModelName}", modelName);
                }

                yield return progress;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }

        // Yield error after the try-finally block
        if (errorProgress != null)
        {
            yield return errorProgress;
        }
    }

    /// <summary>
    /// Delete a model from the local or remote Ollama instance.
    /// </summary>
    /// <param name="modelName">Name of the model to delete</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<(bool Success, string? ErrorMessage)> DeleteModelAsync(
        string modelName,
        string? remoteOllamaUrl = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            return (false, "Ollama provider is not enabled or configured");
        }

        try
        {
            _logger.LogInformation("Deleting model: {ModelName} from {Url}", modelName, effectiveUrl);
            await client.DeleteModelAsync(modelName, cancellationToken);
            _logger.LogInformation("Model deleted: {ModelName}", modelName);
            return (true, null);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Model delete failed - service unreachable at {Url}", effectiveUrl);
            return (false, $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete model {ModelName}", modelName);
            return (false, ex.Message);
        }
    }
}
