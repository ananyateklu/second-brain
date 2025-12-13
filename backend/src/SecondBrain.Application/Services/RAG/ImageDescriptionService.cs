using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.RAG.Interfaces;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for extracting text descriptions from images using vision-capable AI models.
/// Prioritizes Gemini for cost-effectiveness, falls back to OpenAI/Claude.
/// </summary>
public class ImageDescriptionService : IImageDescriptionService
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly AIProvidersSettings _settings;
    private readonly ILogger<ImageDescriptionService> _logger;

    // Provider priority for image description (cost-optimized)
    private static readonly string[] ProviderPriority = { "gemini", "openai", "claude" };

    // Vision-capable models by provider (fast, cost-effective variants)
    private static readonly Dictionary<string, string> PreferredVisionModels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["gemini"] = "gemini-2.5-flash",      // Fast vision model
        ["openai"] = "gpt-4o-mini",           // $0.15/1M input
        ["claude"] = "claude-3-haiku-20240307" // $0.25/1M input
    };

    private const string DescriptionPrompt = @"Analyze this image and provide a detailed description that would be useful for text-based search. Include:
1. Main subject/content of the image
2. Key visual elements (objects, people, text, diagrams)
3. Any text visible in the image (OCR)
4. Colors, layout, and composition if relevant
5. Context clues about what the image represents

Be concise but comprehensive. Focus on searchable, factual information.";

    private const string ContextualPrompt = @"Analyze this image from a note titled ""{0}"". Provide a detailed description for text-based search that includes:
1. Main subject/content
2. Key visual elements and any visible text
3. How the image relates to the note context
4. Factual, searchable information

Be concise but comprehensive.";

    public ImageDescriptionService(
        IAIProviderFactory providerFactory,
        Microsoft.Extensions.Options.IOptions<AIProvidersSettings> settings,
        ILogger<ImageDescriptionService> logger)
    {
        _providerFactory = providerFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public bool IsAvailable
    {
        get
        {
            // Check if any vision-capable provider is available
            foreach (var providerName in ProviderPriority)
            {
                try
                {
                    var provider = _providerFactory.GetProvider(providerName);
                    if (provider?.IsEnabled == true)
                    {
                        return true;
                    }
                }
                catch
                {
                    // Provider not available
                }
            }
            return false;
        }
    }

    public async Task<ImageDescriptionResult> ExtractDescriptionAsync(
        string base64ImageData,
        string mediaType,
        string? context = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(base64ImageData))
        {
            return ImageDescriptionResult.Failure(null, "Image data is empty");
        }

        // Find available vision provider
        IAIProvider? provider = null;
        string? providerName = null;
        string? modelName = null;

        foreach (var name in ProviderPriority)
        {
            try
            {
                var p = _providerFactory.GetProvider(name);
                if (p?.IsEnabled == true)
                {
                    // Check if the image format is supported
                    if (MultimodalConfig.IsImageFormatSupported(name, mediaType))
                    {
                        provider = p;
                        providerName = name;
                        modelName = PreferredVisionModels.GetValueOrDefault(name) ?? PreferredVisionModels["gemini"];
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Provider {Provider} not available for image description", name);
            }
        }

        if (provider == null || providerName == null)
        {
            return ImageDescriptionResult.Failure(null, "No vision-capable AI provider available");
        }

        try
        {
            var prompt = string.IsNullOrEmpty(context)
                ? DescriptionPrompt
                : string.Format(ContextualPrompt, context);

            var messages = new List<ChatMessage>
            {
                new()
                {
                    Role = "user",
                    Content = prompt,
                    Images = new List<MessageImage>
                    {
                        new()
                        {
                            Base64Data = base64ImageData,
                            MediaType = mediaType
                        }
                    }
                }
            };

            var request = new AIRequest
            {
                Model = modelName,
                MaxTokens = 1000,
                Temperature = 0.3f // Lower temperature for factual descriptions
            };

            _logger.LogDebug("Extracting image description using {Provider}/{Model}", providerName, modelName);

            var response = await provider.GenerateChatCompletionAsync(messages, request, cancellationToken);

            if (!response.Success || string.IsNullOrEmpty(response.Content))
            {
                return ImageDescriptionResult.Failure(null, response.Error ?? "Failed to extract description");
            }

            return new ImageDescriptionResult
            {
                Success = true,
                Description = response.Content.Trim(),
                Provider = providerName,
                Model = modelName,
                InputTokens = response.Usage?.InputTokens,
                OutputTokens = response.Usage?.OutputTokens
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting image description using {Provider}", providerName);
            return ImageDescriptionResult.Failure(null, ex.Message);
        }
    }

    public async Task<List<ImageDescriptionResult>> ExtractDescriptionsBatchAsync(
        IEnumerable<ImageInput> images,
        string? context = null,
        CancellationToken cancellationToken = default)
    {
        var results = new List<ImageDescriptionResult>();
        var imageList = images.ToList();

        if (imageList.Count == 0)
        {
            return results;
        }

        _logger.LogInformation("Extracting descriptions for {Count} images", imageList.Count);

        // Process images sequentially to avoid rate limits
        // Could be parallelized with rate limiting for large batches
        foreach (var image in imageList)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            var result = await ExtractDescriptionAsync(
                image.Base64Data,
                image.MediaType,
                context,
                cancellationToken);

            result.ImageId = image.Id;

            // If user provided alt text, append it to the description
            if (!string.IsNullOrEmpty(image.AltText))
            {
                if (result.Success && !string.IsNullOrEmpty(result.Description))
                {
                    result.Description = $"[User description: {image.AltText}]\n\n{result.Description}";
                }
                else if (!result.Success)
                {
                    // Use alt text as fallback if AI extraction failed
                    result.Success = true;
                    result.Description = $"[User description: {image.AltText}]";
                    result.Provider = "user";
                    result.Model = "alt_text";
                }
            }

            results.Add(result);
        }

        var successCount = results.Count(r => r.Success);
        _logger.LogInformation("Extracted {Success}/{Total} image descriptions", successCount, imageList.Count);

        return results;
    }
}
