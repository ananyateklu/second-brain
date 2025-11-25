using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Diagnostics;
using System.Net.Sockets;
using System.Runtime.CompilerServices;

namespace SecondBrain.Application.Services.AI.Providers;

public class OllamaProvider : IAIProvider
{
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaProvider> _logger;
    private readonly OllamaApiClient? _client;

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
                _client = new OllamaApiClient(new Uri(_settings.BaseUrl))
                {
                    SelectedModel = _settings.DefaultModel
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Ollama client");
            }
        }
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
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
            await foreach (var stream in _client.Generate(generateRequest))
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
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
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
        if (!IsEnabled || _client == null)
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
            var chatMessages = messages.Select(m => new Message
            {
                Role = m.Role.ToLower(),
                Content = m.Content
            }).ToList();

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
            await foreach (var stream in _client.Chat(chatRequest))
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
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama chat completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            _logger.LogWarning(ex, "Ollama chat completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.",
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
        if (!IsEnabled || _client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamCompletionInternalAsync(request, cancellationToken),
            "Ollama streaming"));
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

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
            stream = _client.Generate(generateRequest);
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
        if (!IsEnabled || _client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamChatCompletionInternalAsync(messages, settings, cancellationToken),
            "Ollama chat streaming"));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var chatMessages = messages.Select(m => new Message
        {
            Role = m.Role.ToLower(),
            Content = m.Content
        }).ToList();

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
            stream = _client.Chat(chatRequest);
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

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var models = await _client.ListLocalModels(cancellationToken);
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

    public async Task<AIProviderHealth> GetHealthStatusAsync(
        CancellationToken cancellationToken = default)
    {
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

        if (_client == null)
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
            var models = await _client.ListLocalModels(linkedCts.Token);
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
            health.ErrorMessage = $"Connection to Ollama at {_settings.BaseUrl} timed out. Ensure Ollama is running and accessible.";
            _logger.LogDebug("Ollama health check timed out at {BaseUrl} - service may be unreachable", _settings.BaseUrl);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl} (connection refused)", _settings.BaseUrl);
        }
        catch (HttpRequestException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl}", _settings.BaseUrl);
        }
        catch (SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {_settings.BaseUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - socket connection refused at {BaseUrl}", _settings.BaseUrl);
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
}
