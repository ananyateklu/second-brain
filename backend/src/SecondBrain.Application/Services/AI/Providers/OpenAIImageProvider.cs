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
/// OpenAI DALL-E 3 image generation provider
/// </summary>
public class OpenAIImageProvider : IImageGenerationProvider
{
    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIImageProvider> _logger;
    private readonly HttpClient _httpClient;

    private static readonly string[] SupportedModels = { "dall-e-3", "dall-e-2" };
    
    private static readonly Dictionary<string, string[]> ModelSizes = new()
    {
        { "dall-e-3", new[] { "1024x1024", "1792x1024", "1024x1792" } },
        { "dall-e-2", new[] { "256x256", "512x512", "1024x1024" } }
    };

    public string ProviderName => "OpenAI";
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public OpenAIImageProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<OpenAIImageProvider> logger)
    {
        _settings = settings.Value.OpenAI;
        _logger = logger;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri("https://api.openai.com/v1/"),
            Timeout = TimeSpan.FromSeconds(120) // Image generation can take longer
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
                Error = "OpenAI provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var model = request.Model ?? "dall-e-3";
            
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

            // Validate size for model
            if (ModelSizes.TryGetValue(model, out var validSizes) && !validSizes.Contains(request.Size))
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = $"Invalid size {request.Size} for {model}. Valid sizes: {string.Join(", ", validSizes)}",
                    Provider = ProviderName
                };
            }

            var requestBody = new Dictionary<string, object>
            {
                { "model", model },
                { "prompt", request.Prompt },
                { "n", Math.Min(request.Count, model == "dall-e-3" ? 1 : 10) }, // DALL-E 3 only supports n=1
                { "size", request.Size },
                { "response_format", request.ResponseFormat }
            };

            // DALL-E 3 specific options
            if (model == "dall-e-3")
            {
                requestBody["quality"] = request.Quality;
                requestBody["style"] = request.Style;
            }

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogInformation("Generating image with OpenAI DALL-E. Model: {Model}, Size: {Size}", 
                model, request.Size);

            var response = await _httpClient.PostAsync("images/generations", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("OpenAI image generation failed. Status: {Status}, Response: {Response}", 
                    response.StatusCode, responseContent);
                
                // Try to parse error message
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

            var result = JsonSerializer.Deserialize<OpenAIImageResponse>(responseContent, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result?.Data == null || result.Data.Count == 0)
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = "No images returned from OpenAI",
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

            _logger.LogInformation("Successfully generated {Count} image(s) with OpenAI DALL-E", images.Count);

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
            _logger.LogWarning("OpenAI image generation request was cancelled");
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "Request was cancelled or timed out",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image with OpenAI");
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
            // Just check if we can reach the models endpoint
            var response = await _httpClient.GetAsync("models", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI availability check failed");
            return false;
        }
    }

    public IEnumerable<string> GetSupportedModels() => SupportedModels;

    public IEnumerable<string> GetSupportedSizes(string model)
    {
        return ModelSizes.TryGetValue(model, out var sizes) ? sizes : ModelSizes["dall-e-3"];
    }

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

    // Response models for deserialization
    private class OpenAIImageResponse
    {
        public List<OpenAIImageData> Data { get; set; } = new();
    }

    private class OpenAIImageData
    {
        public string? Url { get; set; }
        public string? B64Json { get; set; }
        public string? RevisedPrompt { get; set; }
    }
}

