using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

/// <summary>
/// xAI Grok Aurora image generation provider
/// Uses OpenAI-compatible API format
/// </summary>
public class GrokImageProvider : IImageGenerationProvider
{
    private readonly XAISettings _settings;
    private readonly ILogger<GrokImageProvider> _logger;
    private readonly HttpClient _httpClient;

    // Grok image generation models (Aurora)
    private static readonly string[] SupportedModels = 
    { 
        "grok-2-image",
        "grok-2-image-1212"
    };
    
    // Note: Grok API does NOT support size parameter - images are generated at default resolution
    // Keeping this for UI display purposes only
    private static readonly string[] SupportedSizes =
    {
        "1024x1024"  // Default size, cannot be changed via API
    };

    public string ProviderName => "Grok";
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public GrokImageProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<GrokImageProvider> logger)
    {
        _settings = settings.Value.XAI;
        _logger = logger;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/"),
            Timeout = TimeSpan.FromSeconds(120)
        };

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        }
    }

    public async Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "Grok provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var model = request.Model ?? "grok-2-image";
            
            // Validate model
            if (!SupportedModels.Contains(model))
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = $"Unsupported model: {model}. Supported models: {string.Join(", ", SupportedModels)}",
                    Provider = ProviderName
                };
            }

            // xAI uses OpenAI-compatible API format
            // Note: Grok API does NOT support size, quality, or style parameters
            var requestBody = new Dictionary<string, object>
            {
                { "model", model },
                { "prompt", request.Prompt },
                { "n", Math.Min(request.Count, 10) },  // Grok supports up to 10 images per request
                { "response_format", request.ResponseFormat }
            };

            // Note: size parameter is intentionally NOT included - Grok API doesn't support it

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogInformation("Generating image with Grok Aurora. Model: {Model}, Count: {Count}",
                model, Math.Min(request.Count, 10));

            var response = await _httpClient.PostAsync("images/generations", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Grok image generation failed. Status: {Status}, Response: {Response}", 
                    response.StatusCode, responseContent);
                
                var errorMessage = TryParseErrorMessage(responseContent) ?? 
                    $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
                
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = errorMessage,
                    Provider = ProviderName,
                    Model = model
                };
            }

            var result = JsonSerializer.Deserialize<GrokImageResponse>(responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            _logger.LogDebug("Grok API response parsed. Data count: {Count}, First image has base64: {HasBase64}, has URL: {HasUrl}",
                result?.Data?.Count ?? 0,
                result?.Data?.FirstOrDefault()?.B64Json != null,
                result?.Data?.FirstOrDefault()?.Url != null);

            if (result?.Data == null || result.Data.Count == 0)
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = "No images returned from Grok",
                    Provider = ProviderName,
                    Model = model
                };
            }

            // Parse dimensions from size
            var dimensions = ParseDimensions(request.Size);

            var images = result.Data.Select(img => new GeneratedImage
            {
                Base64Data = img.B64Json,
                Url = img.Url,
                RevisedPrompt = img.RevisedPrompt,
                MediaType = "image/png",
                Width = dimensions.width,
                Height = dimensions.height
            }).ToList();

            _logger.LogInformation("Successfully generated {Count} image(s) with Grok Aurora", images.Count);

            return new ImageGenerationResponse
            {
                Success = true,
                Images = images,
                Model = model,
                Provider = ProviderName
            };
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Grok image generation request was cancelled");
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "Request was cancelled or timed out",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image with Grok");
            return new ImageGenerationResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
            return false;

        try
        {
            var response = await _httpClient.GetAsync("models", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Grok availability check failed");
            return false;
        }
    }

    public IEnumerable<string> GetSupportedModels() => SupportedModels;

    public IEnumerable<string> GetSupportedSizes(string model) => SupportedSizes;

    private static string? TryParseErrorMessage(string responseContent)
    {
        try
        {
            var doc = JsonDocument.Parse(responseContent);
            if (doc.RootElement.TryGetProperty("error", out var errorElement))
            {
                if (errorElement.TryGetProperty("message", out var messageElement))
                {
                    return messageElement.GetString();
                }
            }
        }
        catch
        {
            // Ignore parsing errors
        }
        return null;
    }

    private static (int width, int height) ParseDimensions(string size)
    {
        var parts = size.Split('x');
        if (parts.Length == 2 && int.TryParse(parts[0], out var width) && int.TryParse(parts[1], out var height))
        {
            return (width, height);
        }
        return (1024, 1024);
    }

    // Response models for deserialization (OpenAI-compatible format)
    private class GrokImageResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("data")]
        public List<GrokImageData> Data { get; set; } = new();
    }

    private class GrokImageData
    {
        [System.Text.Json.Serialization.JsonPropertyName("url")]
        public string? Url { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("b64_json")]
        public string? B64Json { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("revised_prompt")]
        public string? RevisedPrompt { get; set; }
    }
}

