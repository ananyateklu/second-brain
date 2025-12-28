using System.Text.Json;
using System.Text.RegularExpressions;
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
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
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
            GenerateContentResponse? response;
            try
            {
                response = await _client!.Models.GenerateContentAsync(
                    model: modelName,
                    contents: prompt,
                    config: config);
            }
            catch (Exception apiEx)
            {
                _logger.LogError(apiEx, "Gemini API error during structured output generation. Model: {Model}, Error: {Error}",
                    modelName, apiEx.Message);
                throw;
            }

            // Log detailed response info for debugging (use Information level to ensure visibility)
            if (response == null)
            {
                _logger.LogWarning("Gemini structured output: response is null for model {Model}", modelName);
                result.Success = false;
                result.Error = "Gemini returned null response";
                return result;
            }

            if (response.Candidates == null || response.Candidates.Count == 0)
            {
                _logger.LogWarning("Gemini structured output: no candidates returned for model {Model}. " +
                    "PromptFeedback: {Feedback}, BlockReason: {BlockReason}",
                    modelName,
                    response.PromptFeedback?.ToString() ?? "null",
                    response.PromptFeedback?.BlockReason?.ToString() ?? "null");
            }
            else
            {
                var firstCandidate = response.Candidates[0];
                var outputTokens = response.UsageMetadata?.CandidatesTokenCount ?? 0;
                var totalTokens = response.UsageMetadata?.TotalTokenCount ?? 0;

                // Log at Information level to ensure visibility - FinishReason is critical for debugging truncation
                _logger.LogInformation("Gemini structured output response. Model: {Model}, FinishReason: {FinishReason}, " +
                    "OutputTokens: {OutputTokens}, TotalTokens: {TotalTokens}, MaxConfigured: {MaxTokens}",
                    modelName,
                    firstCandidate.FinishReason?.ToString() ?? "null",
                    outputTokens,
                    totalTokens,
                    options.MaxTokens ?? _providerSettings.MaxTokens);
            }

            // Extract text from response
            var responseText = ExtractText(response);

            if (string.IsNullOrEmpty(responseText))
            {
                result.Success = false;
                result.Error = "Gemini returned empty response";
                return result;
            }

            // Clean JSON response (remove markdown blocks, fix malformed numbers, etc.)
            responseText = CleanJsonResponse(responseText);

            result.RawResponse = responseText;

            // Track token usage if available
            if (response.UsageMetadata != null)
            {
                result.InputTokens = response.UsageMetadata.PromptTokenCount;
                result.OutputTokens = response.UsageMetadata.CandidatesTokenCount;
            }

            // Parse JSON response with fallback for malformed content
            T? parsed = null;
            try
            {
                parsed = JsonSerializer.Deserialize<T>(responseText, JsonOptions);
            }
            catch (JsonException firstEx)
            {
                // Log the original similarityScore value before cleanup
                var originalScoreMatch = Regex.Match(responseText, @"""similarityScore""\s*:\s*([^\n,\}]+)");
                var originalScore = originalScoreMatch.Success ? originalScoreMatch.Groups[1].Value.Trim() : "not found";

                _logger.LogDebug("First parse failed for {Type}. Original similarityScore: [{OrigScore}], Error: {Error}",
                    typeof(T).Name, originalScore, firstEx.Message);

                // Try aggressive number cleanup and retry
                var aggressivelyCleaned = AggressiveJsonCleanup(responseText);

                // Log the cleaned similarityScore value
                var cleanedScoreMatch = Regex.Match(aggressivelyCleaned, @"""similarityScore""\s*:\s*([^\n,\}]+)");
                var cleanedScore = cleanedScoreMatch.Success ? cleanedScoreMatch.Groups[1].Value.Trim() : "not found";

                // Check if JSON was truncated (missing closing braces)
                var wasTruncated = responseText.TrimEnd().EndsWith("}") == false &&
                                   responseText.TrimEnd().EndsWith("]") == false;

                _logger.LogDebug("After aggressive cleanup - similarityScore: [{CleanedScore}], Changed: {Changed}, WasTruncated: {Truncated}, CleanedEndsCorrectly: {EndsCorrectly}",
                    cleanedScore, aggressivelyCleaned != responseText, wasTruncated,
                    aggressivelyCleaned.TrimEnd().EndsWith("}") || aggressivelyCleaned.TrimEnd().EndsWith("]"));

                if (aggressivelyCleaned != responseText)
                {
                    try
                    {
                        _logger.LogDebug("Retrying JSON parse with aggressive cleanup for type {Type}", typeof(T).Name);
                        parsed = JsonSerializer.Deserialize<T>(aggressivelyCleaned, JsonOptions);
                        result.RawResponse = aggressivelyCleaned; // Update raw response to show what worked
                    }
                    catch (JsonException secondEx)
                    {
                        _logger.LogWarning("Aggressive cleanup also failed for {Type}: {Error}. Original score: [{OrigScore}], Cleaned score: [{CleanedScore}]",
                            typeof(T).Name, secondEx.Message, originalScore, cleanedScore);
                        throw; // Re-throw second exception
                    }
                }
                else
                {
                    _logger.LogWarning("Aggressive cleanup made no changes for {Type}. Score: [{Score}]", typeof(T).Name, originalScore);
                    throw; // Re-throw if aggressive cleanup didn't change anything
                }
            }

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
            // Extract the problematic field value for debugging
            var similarityScoreMatch = Regex.Match(result.RawResponse ?? "", @"""similarityScore""\s*:\s*([^\n,\}]+)");
            var similarityValue = similarityScoreMatch.Success ? similarityScoreMatch.Groups[1].Value : "not found";

            _logger.LogError(ex, "Failed to parse Gemini structured output as {Type}. SimilarityScore value: [{SimilarityValue}]. Raw response (first 500 chars): {RawResponse}",
                typeof(T).Name,
                similarityValue,
                result.RawResponse?.Length > 500 ? result.RawResponse[..500] + "..." : result.RawResponse);
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
    /// Clean JSON response by removing markdown blocks, fixing malformed numbers, and normalizing whitespace.
    /// </summary>
    private static string CleanJsonResponse(string response)
    {
        if (string.IsNullOrWhiteSpace(response))
            return response;

        var cleaned = response.Trim();

        // Remove markdown code blocks if present
        if (cleaned.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned.Substring(7);
        }
        else if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned.Substring(3);
        }

        if (cleaned.EndsWith("```"))
        {
            cleaned = cleaned.Substring(0, cleaned.Length - 3);
        }

        cleaned = cleaned.Trim();

        // CRITICAL: Truncate ALL decimal numbers to max 4 decimal places
        // This catches any number with 5+ decimal digits (like 0.75555 or 0.8500000)
        // Using a MatchEvaluator to handle each number individually
        cleaned = Regex.Replace(cleaned, @"(\d+)\.(\d{5,})", match =>
        {
            var intPart = match.Groups[1].Value;
            var decPart = match.Groups[2].Value;
            // Keep only first 4 decimal digits for safety
            return $"{intPart}.{decPart.Substring(0, 4)}";
        });

        // Fix malformed decimal numbers (e.g., "0.50.50" -> "0.50", "0.7.5" -> "0.7")
        // This regex finds numbers with multiple decimal points and keeps only the first valid decimal
        cleaned = Regex.Replace(cleaned, @"(\d+\.\d+)\.+\d*", "$1");

        // Fix scientific notation issues (e.g., "1e-10.5" -> "1e-10")
        cleaned = Regex.Replace(cleaned, @"(\d+[eE][+-]?\d+)\.\d+", "$1");

        return cleaned;
    }

    /// <summary>
    /// Aggressive JSON cleanup for malformed responses - used as fallback when standard cleanup fails.
    /// </summary>
    private static string AggressiveJsonCleanup(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        var cleaned = json.Trim();

        // FIRST: Repair truncated/incomplete JSON
        cleaned = RepairTruncatedJson(cleaned);

        // Most aggressive: truncate ANY decimal to just 2 decimal places
        // This handles even short decimals that might have parsing issues
        cleaned = Regex.Replace(cleaned, @"(\d+)\.(\d{3,})", match =>
        {
            var intPart = match.Groups[1].Value;
            var decPart = match.Groups[2].Value;
            return $"{intPart}.{decPart.Substring(0, 2)}";
        });

        // Fix all decimal numbers - even 2-digit ones that might be malformed
        // Match pattern: colon, optional space, number with decimal, then any trailing digits before delimiter
        cleaned = Regex.Replace(cleaned, @":(\s*)(\d+\.\d{1,2})\d*([,\}\]\s\r\n])", ":$1$2$3");

        // Fix integer values that have decimal points where they shouldn't
        // e.g., "count": 5.0.0 -> "count": 5
        cleaned = Regex.Replace(cleaned, @":(\s*)(\d+)\.0+\.?\d*([,\}\]\s\r\n])", ":$1$2$3");

        // Remove any NaN, Infinity, or other invalid JSON number literals
        cleaned = Regex.Replace(cleaned, @":\s*(NaN|Infinity|-Infinity)\s*([,\}\]])", ": 0$2", RegexOptions.IgnoreCase);

        // Fix numbers that end with multiple periods
        cleaned = Regex.Replace(cleaned, @"(\d+\.?\d*)\.+\s*([,\}\]])", "$1$2");

        // Ensure proper spacing around colons and values
        cleaned = Regex.Replace(cleaned, @":\s*\.", ": 0.");

        return cleaned;
    }

    /// <summary>
    /// Repairs truncated JSON by closing unclosed strings, arrays, and objects.
    /// Handles cases where the model output is cut off mid-response.
    /// </summary>
    private static string RepairTruncatedJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        var cleaned = json.Trim();

        // Remove any trailing incomplete values (e.g., number at end without delimiter)
        // Match: number at end of string without proper termination
        cleaned = Regex.Replace(cleaned, @",\s*$", ""); // Remove trailing comma
        cleaned = Regex.Replace(cleaned, @":\s*\d+\.?\d*\s*$", ": 0"); // Replace incomplete number value at end

        // Count opening and closing brackets/braces, track if we're in an unclosed string
        int openBraces = 0;
        int openBrackets = 0;
        bool inString = false;
        char prevChar = '\0';
        int lastStringStart = -1;

        for (int i = 0; i < cleaned.Length; i++)
        {
            char c = cleaned[i];
            if (c == '"' && prevChar != '\\')
            {
                if (!inString)
                {
                    lastStringStart = i;
                }
                inString = !inString;
            }
            else if (!inString)
            {
                if (c == '{') openBraces++;
                else if (c == '}') openBraces--;
                else if (c == '[') openBrackets++;
                else if (c == ']') openBrackets--;
            }
            prevChar = c;
        }

        // If we're still in an unclosed string, we need to close it
        if (inString)
        {
            // The string was truncated mid-value - close it with a placeholder
            // First, remove any trailing partial escape sequence
            if (cleaned.EndsWith("\\"))
            {
                cleaned = cleaned.Substring(0, cleaned.Length - 1);
            }

            // Close the string
            cleaned += "...[truncated]\"";

            // Re-analyze to get correct brace/bracket counts after string closure
            openBraces = 0;
            openBrackets = 0;
            inString = false;
            prevChar = '\0';

            foreach (char c in cleaned)
            {
                if (c == '"' && prevChar != '\\')
                {
                    inString = !inString;
                }
                else if (!inString)
                {
                    if (c == '{') openBraces++;
                    else if (c == '}') openBraces--;
                    else if (c == '[') openBrackets++;
                    else if (c == ']') openBrackets--;
                }
                prevChar = c;
            }
        }

        // Add missing closing brackets and braces
        // First close any open arrays, then close objects
        for (int i = 0; i < openBrackets; i++)
        {
            cleaned += "]";
        }
        for (int i = 0; i < openBraces; i++)
        {
            cleaned += "}";
        }

        return cleaned;
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
