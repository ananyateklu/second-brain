using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Text;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

/// <summary>
/// Google Gemini/Imagen image generation provider.
/// Uses SDK's GenerateImagesAsync for Imagen models and raw HTTP for Gemini models.
/// </summary>
public class GeminiImageProvider : IImageGenerationProvider
{
    public const string HttpClientName = "GeminiImage";

    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiImageProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly Client? _client;

    // Gemini image generation models
    private static readonly string[] SupportedModels =
    {
        "imagen-3.0-generate-002",
        "imagen-3.0-generate-001",
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
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiImageProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        // Initialize SDK client for Imagen models
        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client for image generation");
            }
        }
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        client.Timeout = TimeSpan.FromSeconds(120);
        return client;
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

        var httpClient = CreateHttpClient();
        var response = await httpClient.PostAsync(endpoint, httpContent, cancellationToken);
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
    /// Generate image using Imagen 3 API via SDK.
    /// Falls back to HTTP if SDK is not available.
    /// </summary>
    private async Task<ImageGenerationResponse> GenerateWithImagenAsync(
        string model,
        ImageGenerationRequest request,
        CancellationToken cancellationToken)
    {
        // Try SDK-based generation first
        if (_client != null)
        {
            return await GenerateWithImagenSdkAsync(model, request, cancellationToken);
        }

        // Fallback to HTTP-based generation
        return await GenerateWithImagenHttpAsync(model, request, cancellationToken);
    }

    /// <summary>
    /// Generate image using Imagen via SDK's GenerateImagesAsync
    /// </summary>
    private async Task<ImageGenerationResponse> GenerateWithImagenSdkAsync(
        string model,
        ImageGenerationRequest request,
        CancellationToken cancellationToken)
    {
        if (_client == null)
        {
            return new ImageGenerationResponse
            {
                Success = false,
                Error = "Gemini SDK client is not initialized",
                Provider = ProviderName,
                Model = model
            };
        }

        try
        {
            var aspectRatio = ConvertSizeToAspectRatio(request.Size);

            _logger.LogInformation(
                "Generating image with Imagen SDK. Model: {Model}, AspectRatio: {AspectRatio}, Count: {Count}",
                model, aspectRatio, request.Count);

            var config = new GenerateImagesConfig
            {
                NumberOfImages = Math.Min(request.Count, 4),
                AspectRatio = aspectRatio,
                OutputMimeType = "image/png",
                SafetyFilterLevel = SafetyFilterLevel.BLOCK_MEDIUM_AND_ABOVE,
                PersonGeneration = PersonGeneration.ALLOW_ADULT,
                IncludeSafetyAttributes = true
            };

            var response = await _client.Models.GenerateImagesAsync(
                model: model,
                prompt: request.Prompt,
                config: config);

            if (response?.GeneratedImages == null || response.GeneratedImages.Count == 0)
            {
                // Check for RAI (Responsible AI) filtering
                var raiReason = response?.GeneratedImages?.FirstOrDefault()?.RaiFilteredReason;
                var errorMsg = !string.IsNullOrEmpty(raiReason)
                    ? $"Image generation blocked by safety filter: {raiReason}"
                    : "No images returned from Imagen. The prompt may have been blocked by safety filters.";

                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = errorMsg,
                    Provider = ProviderName,
                    Model = model
                };
            }

            var dimensions = ParseDimensions(request.Size);
            var images = new List<Models.GeneratedImage>();

            foreach (var generatedImage in response.GeneratedImages)
            {
                if (generatedImage?.Image?.ImageBytes != null)
                {
                    images.Add(new Models.GeneratedImage
                    {
                        Base64Data = Convert.ToBase64String(generatedImage.Image.ImageBytes),
                        MediaType = generatedImage.Image.MimeType ?? "image/png",
                        Width = dimensions.width,
                        Height = dimensions.height
                    });
                }
            }

            if (images.Count == 0)
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = "No valid images in response",
                    Provider = ProviderName,
                    Model = model
                };
            }

            _logger.LogInformation("Successfully generated {Count} image(s) with Imagen SDK", images.Count);

            return new ImageGenerationResponse
            {
                Success = true,
                Images = images,
                Model = model,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image with Imagen SDK");

            // Fall back to HTTP method if SDK fails
            _logger.LogInformation("Falling back to HTTP-based Imagen generation");
            return await GenerateWithImagenHttpAsync(model, request, cancellationToken);
        }
    }

    /// <summary>
    /// Generate image using Imagen via raw HTTP (fallback)
    /// </summary>
    private async Task<ImageGenerationResponse> GenerateWithImagenHttpAsync(
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
                personGeneration = "allow_adult",
                safetyFilterLevel = "block_some"
            }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        _logger.LogInformation("Generating image with Imagen HTTP. Model: {Model}, AspectRatio: {AspectRatio}",
            model, aspectRatio);

        var httpClient = CreateHttpClient();
        var response = await httpClient.PostAsync(endpoint, httpContent, cancellationToken);
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

        _logger.LogInformation("Successfully generated {Count} image(s) with Imagen HTTP", images.Count);

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
            var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync(endpoint, cancellationToken);
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

    private List<Models.GeneratedImage> ParseGeminiImageResponse(string responseContent, string size)
    {
        var images = new List<Models.GeneratedImage>();
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
                                    images.Add(new Models.GeneratedImage
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

    private List<Models.GeneratedImage> ParseImagenResponse(string responseContent, string size)
    {
        var images = new List<Models.GeneratedImage>();
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
                            images.Add(new Models.GeneratedImage
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

