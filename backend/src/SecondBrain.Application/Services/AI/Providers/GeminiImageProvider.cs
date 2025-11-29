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
/// Google Gemini/Imagen image generation provider
/// </summary>
public class GeminiImageProvider : IImageGenerationProvider
{
    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiImageProvider> _logger;
    private readonly HttpClient _httpClient;

    // Gemini image generation models
    private static readonly string[] SupportedModels = 
    { 
        "gemini-3-pro-image-preview",
        "gemini-2.5-flash-image-preview",
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-exp-image-generation"

    };
    
    // Imagen 3 supports these aspect ratios
    private static readonly string[] SupportedSizes = 
    { 
        "1024x1024",  // 1:1
        "1536x1024",  // 3:2 landscape
        "1024x1536",  // 2:3 portrait
        "1792x1024",  // 16:9 landscape
        "1024x1792"   // 9:16 portrait
    };

    public string ProviderName => "Gemini";
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public GeminiImageProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<GeminiImageProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(120)
        };
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
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var model = request.Model ?? "gemini-2.0-flash-preview-image-generation";
            
            // Check if it's an Imagen model or Gemini model
            if (model.StartsWith("imagen"))
            {
                return await GenerateWithImagenAsync(model, request, cancellationToken);
            }
            else
            {
                return await GenerateWithGeminiAsync(model, request, cancellationToken);
            }
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Gemini image generation request was cancelled");
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "Request was cancelled or timed out",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image with Gemini");
            return new ImageGenerationResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    /// <summary>
    /// Generate image using Gemini 2.0 Flash with native image generation
    /// </summary>
    private async Task<ImageGenerationResponse> GenerateWithGeminiAsync(
        string model,
        ImageGenerationRequest request,
        CancellationToken cancellationToken)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_settings.ApiKey}";

        // Gemini uses responseModalities to request image output
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = request.Prompt }
                    }
                }
            },
            generationConfig = new
            {
                responseModalities = new[] { "TEXT", "IMAGE" },
                responseMimeType = "text/plain"
            }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        _logger.LogInformation("Generating image with Gemini. Model: {Model}", model);

        var response = await _httpClient.PostAsync(endpoint, httpContent, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini image generation failed. Status: {Status}, Response: {Response}", 
                response.StatusCode, responseContent);
            
            var errorMessage = TryParseGeminiError(responseContent) ?? 
                $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
            
            return new ImageGenerationResponse
            {
                Success = false,
                Error = errorMessage,
                Provider = ProviderName,
                Model = model
            };
        }

        // Parse the response
        var images = ParseGeminiImageResponse(responseContent, request.Size);

        if (images.Count == 0)
        {
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "No images returned from Gemini. The model may have declined to generate the image.",
                Provider = ProviderName,
                Model = model
            };
        }

        _logger.LogInformation("Successfully generated {Count} image(s) with Gemini", images.Count);

        return new ImageGenerationResponse
        {
            Success = true,
            Images = images,
            Model = model,
            Provider = ProviderName
        };
    }

    /// <summary>
    /// Generate image using Imagen 3 API
    /// </summary>
    private async Task<ImageGenerationResponse> GenerateWithImagenAsync(
        string model,
        ImageGenerationRequest request,
        CancellationToken cancellationToken)
    {
        // Imagen 3 uses a different endpoint structure
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={_settings.ApiKey}";

        // Convert size to aspect ratio for Imagen
        var aspectRatio = ConvertSizeToAspectRatio(request.Size);

        var requestBody = new
        {
            instances = new[]
            {
                new { prompt = request.Prompt }
            },
            parameters = new
            {
                sampleCount = Math.Min(request.Count, 4),
                aspectRatio = aspectRatio,
                personGeneration = "allow_adult", // Options: dont_allow, allow_adult
                safetyFilterLevel = "block_some" // Options: block_none, block_few, block_some, block_most
            }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        _logger.LogInformation("Generating image with Imagen 3. Model: {Model}, AspectRatio: {AspectRatio}", 
            model, aspectRatio);

        var response = await _httpClient.PostAsync(endpoint, httpContent, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Imagen image generation failed. Status: {Status}, Response: {Response}", 
                response.StatusCode, responseContent);
            
            var errorMessage = TryParseGeminiError(responseContent) ?? 
                $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}";
            
            return new ImageGenerationResponse
            {
                Success = false,
                Error = errorMessage,
                Provider = ProviderName,
                Model = model
            };
        }

        var images = ParseImagenResponse(responseContent, request.Size);

        if (images.Count == 0)
        {
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "No images returned from Imagen",
                Provider = ProviderName,
                Model = model
            };
        }

        _logger.LogInformation("Successfully generated {Count} image(s) with Imagen 3", images.Count);

        return new ImageGenerationResponse
        {
            Success = true,
            Images = images,
            Model = model,
            Provider = ProviderName
        };
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
            return false;

        try
        {
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models?key={_settings.ApiKey}";
            var response = await _httpClient.GetAsync(endpoint, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini availability check failed");
            return false;
        }
    }

    public IEnumerable<string> GetSupportedModels() => SupportedModels;

    public IEnumerable<string> GetSupportedSizes(string model) => SupportedSizes;

    private static string ConvertSizeToAspectRatio(string size)
    {
        return size switch
        {
            "1024x1024" => "1:1",
            "1536x1024" => "3:2",
            "1024x1536" => "2:3",
            "1792x1024" => "16:9",
            "1024x1792" => "9:16",
            _ => "1:1"
        };
    }

    private List<GeneratedImage> ParseGeminiImageResponse(string responseContent, string size)
    {
        var images = new List<GeneratedImage>();
        var dimensions = ParseDimensions(size);

        try
        {
            var doc = JsonDocument.Parse(responseContent);
            
            if (doc.RootElement.TryGetProperty("candidates", out var candidates))
            {
                foreach (var candidate in candidates.EnumerateArray())
                {
                    if (candidate.TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts))
                    {
                        foreach (var part in parts.EnumerateArray())
                        {
                            // Check for inline image data
                            if (part.TryGetProperty("inlineData", out var inlineData))
                            {
                                var mimeType = inlineData.TryGetProperty("mimeType", out var mime) 
                                    ? mime.GetString() ?? "image/png" 
                                    : "image/png";
                                var data = inlineData.TryGetProperty("data", out var dataElement) 
                                    ? dataElement.GetString() 
                                    : null;

                                if (!string.IsNullOrEmpty(data))
                                {
                                    images.Add(new GeneratedImage
                                    {
                                        Base64Data = data,
                                        MediaType = mimeType,
                                        Width = dimensions.width,
                                        Height = dimensions.height
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error parsing Gemini image response");
        }

        return images;
    }

    private List<GeneratedImage> ParseImagenResponse(string responseContent, string size)
    {
        var images = new List<GeneratedImage>();
        var dimensions = ParseDimensions(size);

        try
        {
            var doc = JsonDocument.Parse(responseContent);
            
            if (doc.RootElement.TryGetProperty("predictions", out var predictions))
            {
                foreach (var prediction in predictions.EnumerateArray())
                {
                    if (prediction.TryGetProperty("bytesBase64Encoded", out var imageData))
                    {
                        var data = imageData.GetString();
                        if (!string.IsNullOrEmpty(data))
                        {
                            images.Add(new GeneratedImage
                            {
                                Base64Data = data,
                                MediaType = "image/png",
                                Width = dimensions.width,
                                Height = dimensions.height
                            });
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error parsing Imagen response");
        }

        return images;
    }

    private static string? TryParseGeminiError(string responseContent)
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
}

