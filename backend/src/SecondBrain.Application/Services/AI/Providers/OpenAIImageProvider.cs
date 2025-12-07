using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Images;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SdkGeneratedImage = OpenAI.Images.GeneratedImage;

namespace SecondBrain.Application.Services.AI.Providers;

/// <summary>
/// OpenAI DALL-E image generation provider using the official OpenAI .NET SDK
/// </summary>
public class OpenAIImageProvider : IImageGenerationProvider
{
    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIImageProvider> _logger;
    private readonly OpenAIClient? _openAIClient;

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

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _openAIClient = new OpenAIClient(_settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI client for image generation");
            }
        }
    }

    public async Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _openAIClient == null)
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

            // Get the image client for the specified model
            var imageClient = _openAIClient.GetImageClient(model);

            // Build image generation options
            var options = new ImageGenerationOptions
            {
                Size = MapSize(request.Size),
                ResponseFormat = GeneratedImageFormat.Bytes // Always get bytes for consistent handling
            };

            // DALL-E 3 specific options
            if (model == "dall-e-3")
            {
                options.Quality = MapQuality(request.Quality);
                options.Style = MapStyle(request.Style);
            }

            _logger.LogInformation("Generating image with OpenAI DALL-E SDK. Model: {Model}, Size: {Size}, Quality: {Quality}, Style: {Style}",
                model, request.Size, request.Quality, request.Style);

            // Generate the image using SDK
            var result = await imageClient.GenerateImageAsync(request.Prompt, options, cancellationToken);

            if (result?.Value == null)
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    Error = "No image returned from OpenAI",
                    Provider = ProviderName,
                    Model = model
                };
            }

            SdkGeneratedImage sdkImage = result.Value;

            // Parse dimensions from size
            var dimensions = ParseDimensions(request.Size);

            // Convert SDK response to our response format
            var images = new List<Models.GeneratedImage>
            {
                new Models.GeneratedImage
                {
                    Base64Data = sdkImage.ImageBytes != null
                        ? Convert.ToBase64String(sdkImage.ImageBytes.ToArray())
                        : null,
                    Url = sdkImage.ImageUri?.ToString(),
                    RevisedPrompt = sdkImage.RevisedPrompt,
                    MediaType = "image/png",
                    Width = dimensions.width,
                    Height = dimensions.height
                }
            };

            _logger.LogInformation("Successfully generated image with OpenAI DALL-E SDK");

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
            _logger.LogError(ex, "Error generating image with OpenAI SDK");
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
        if (!IsEnabled || _openAIClient == null)
            return false;

        try
        {
            // Use the models endpoint to check availability
            var modelClient = _openAIClient.GetOpenAIModelClient();
            var models = await modelClient.GetModelsAsync(cancellationToken);
            return models?.Value != null;
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

    /// <summary>
    /// Map size string to SDK GeneratedImageSize enum
    /// </summary>
    private static GeneratedImageSize MapSize(string size)
    {
        return size switch
        {
            "256x256" => GeneratedImageSize.W256xH256,
            "512x512" => GeneratedImageSize.W512xH512,
            "1024x1024" => GeneratedImageSize.W1024xH1024,
            "1792x1024" => GeneratedImageSize.W1792xH1024,
            "1024x1792" => GeneratedImageSize.W1024xH1792,
            _ => GeneratedImageSize.W1024xH1024 // Default
        };
    }

    /// <summary>
    /// Map quality string to SDK GeneratedImageQuality enum
    /// </summary>
    private static GeneratedImageQuality MapQuality(string quality)
    {
        return quality?.ToLowerInvariant() switch
        {
            "hd" or "high" => GeneratedImageQuality.High,
            "standard" or "low" => GeneratedImageQuality.Standard,
            _ => GeneratedImageQuality.Standard // Default
        };
    }

    /// <summary>
    /// Map style string to SDK GeneratedImageStyle enum
    /// </summary>
    private static GeneratedImageStyle MapStyle(string style)
    {
        return style?.ToLowerInvariant() switch
        {
            "vivid" => GeneratedImageStyle.Vivid,
            "natural" => GeneratedImageStyle.Natural,
            _ => GeneratedImageStyle.Vivid // Default
        };
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
