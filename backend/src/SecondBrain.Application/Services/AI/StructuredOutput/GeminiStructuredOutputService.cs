using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Implementation of structured output generation using Gemini's JSON schema support.
/// </summary>
public class GeminiStructuredOutputService : IGeminiStructuredOutputService
{
    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiStructuredOutputService> _logger;
    private readonly Client? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GeminiStructuredOutputService(
        IOptions<AIProvidersSettings> settings,
        ILogger<GeminiStructuredOutputService> logger)
    {
        _settings = settings.Value.Gemini;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public bool IsAvailable => _settings.Enabled && _client != null;

    /// <inheritdoc />
    public Task<T?> GenerateAsync<T>(string prompt, CancellationToken cancellationToken = default) where T : class
    {
        return GenerateAsync<T>(prompt, new StructuredOutputOptions(), cancellationToken);
    }

    /// <inheritdoc />
    public Task<T?> GenerateAsync<T>(string prompt, string model, CancellationToken cancellationToken = default) where T : class
    {
        return GenerateAsync<T>(prompt, new StructuredOutputOptions { Model = model }, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<T?> GenerateAsync<T>(string prompt, StructuredOutputOptions options, CancellationToken cancellationToken = default) where T : class
    {
        if (!IsAvailable)
        {
            _logger.LogWarning("Gemini structured output service is not available");
            return null;
        }

        var modelName = options.Model ?? _settings.DefaultModel;

        try
        {
            // Build the schema from the type
            var schema = GeminiSchemaBuilder.FromType<T>();

            // Build generation config with JSON response
            var config = new GenerateContentConfig
            {
                ResponseMimeType = "application/json",
                ResponseSchema = schema,
                MaxOutputTokens = options.MaxTokens ?? _settings.MaxTokens,
                Temperature = options.Temperature,
                TopP = _settings.TopP,
                TopK = _settings.TopK
            };

            // Add system instruction if provided
            if (!string.IsNullOrEmpty(options.SystemInstruction))
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = options.SystemInstruction } }
                };
            }

            _logger.LogDebug("Generating structured output for type {Type} with model {Model}",
                typeof(T).Name, modelName);

            // Generate content
            var response = await _client!.Models.GenerateContentAsync(
                model: modelName,
                contents: prompt,
                config: config);

            // Extract text from response
            var text = ExtractText(response);

            if (string.IsNullOrEmpty(text))
            {
                _logger.LogWarning("Gemini returned empty response for structured output");
                return null;
            }

            _logger.LogDebug("Received structured response: {Response}", text);

            // Parse JSON response
            var result = JsonSerializer.Deserialize<T>(text, JsonOptions);

            if (result == null)
            {
                _logger.LogWarning("Failed to deserialize Gemini response to type {Type}", typeof(T).Name);
            }

            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini structured output as {Type}", typeof(T).Name);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from Gemini");
            return null;
        }
    }

    /// <summary>
    /// Extract text from GenerateContentResponse.
    /// </summary>
    private static string ExtractText(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return string.Empty;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null || candidate.Content.Parts.Count == 0)
            return string.Empty;

        // Get first text part
        foreach (var part in candidate.Content.Parts)
        {
            if (!string.IsNullOrEmpty(part?.Text))
            {
                return part.Text;
            }
        }

        return string.Empty;
    }
}
