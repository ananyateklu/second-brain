using System.Text.Json;
using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput.Adapters;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Providers;

/// <summary>
/// Gemini implementation of structured output using native JSON schema support.
/// Uses the shared JsonSchemaBuilder with GeminiSchemaAdapter for conversion.
/// </summary>
public class GeminiStructuredOutputProviderService : IProviderStructuredOutputService
{
    private readonly GeminiSettings _providerSettings;
    private readonly StructuredOutputSettings _structuredSettings;
    private readonly ILogger<GeminiStructuredOutputProviderService> _logger;
    private readonly Client? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GeminiStructuredOutputProviderService(
        IOptions<AIProvidersSettings> providerSettings,
        IOptions<StructuredOutputSettings> structuredSettings,
        ILogger<GeminiStructuredOutputProviderService> logger)
    {
        _providerSettings = providerSettings.Value.Gemini;
        _structuredSettings = structuredSettings.Value;
        _logger = logger;

        if (_providerSettings.Enabled && !string.IsNullOrWhiteSpace(_providerSettings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _providerSettings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Gemini client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public string ProviderName => "Gemini";

    /// <inheritdoc />
    public bool IsAvailable =>
        _providerSettings.Enabled &&
        _structuredSettings.Providers.Gemini.Enabled &&
        _client != null;

    /// <inheritdoc />
    public async Task<StructuredOutputResult<T>> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions options,
        CancellationToken cancellationToken = default) where T : class
    {
        var modelName = options.Model ?? _structuredSettings.Providers.Gemini.Model ?? _providerSettings.DefaultModel;

        var result = new StructuredOutputResult<T>
        {
            Provider = ProviderName,
            Model = modelName
        };

        if (!IsAvailable)
        {
            result.Success = false;
            result.Error = "Gemini structured output service is not available";
            return result;
        }

        try
        {
            // Build the schema from the type using shared builder
            var jsonSchema = JsonSchemaBuilder.FromType<T>();

            // Convert to Gemini-specific schema format using adapter
            var geminiSchema = GeminiSchemaAdapter.ToGeminiSchema(jsonSchema);

            // Build generation config with JSON response
            var config = new GenerateContentConfig
            {
                ResponseMimeType = "application/json",
                ResponseSchema = geminiSchema,
                MaxOutputTokens = options.MaxTokens ?? _providerSettings.MaxTokens,
                Temperature = options.Temperature,
                TopP = _providerSettings.TopP,
                TopK = _providerSettings.TopK
            };

            // Add system instruction if provided
            if (!string.IsNullOrEmpty(options.SystemInstruction))
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = options.SystemInstruction } }
                };
            }

            _logger.LogDebug("Generating Gemini structured output for type {Type} with model {Model}",
                typeof(T).Name, modelName);

            // Generate content
            var response = await _client!.Models.GenerateContentAsync(
                model: modelName,
                contents: prompt,
                config: config);

            // Extract text from response
            var responseText = ExtractText(response);

            if (string.IsNullOrEmpty(responseText))
            {
                result.Success = false;
                result.Error = "Gemini returned empty response";
                return result;
            }

            result.RawResponse = responseText;

            // Track token usage if available
            if (response.UsageMetadata != null)
            {
                result.InputTokens = response.UsageMetadata.PromptTokenCount;
                result.OutputTokens = response.UsageMetadata.CandidatesTokenCount;
            }

            // Parse JSON response
            var parsed = JsonSerializer.Deserialize<T>(responseText, JsonOptions);

            if (parsed == null)
            {
                result.Success = false;
                result.Error = $"Failed to deserialize response to type {typeof(T).Name}";
                return result;
            }

            result.Success = true;
            result.Result = parsed;
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Gemini structured output as {Type}", typeof(T).Name);
            result.Success = false;
            result.Error = $"JSON parsing error: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from Gemini");
            result.Success = false;
            result.Error = ex.Message;
            return result;
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
