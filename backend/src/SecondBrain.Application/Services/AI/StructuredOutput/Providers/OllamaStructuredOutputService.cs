using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput.Adapters;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Providers;

/// <summary>
/// Ollama implementation of structured output using JSON mode.
/// Ollama uses Format = "json" with schema instruction in system prompt.
/// </summary>
public class OllamaStructuredOutputService : IProviderStructuredOutputService
{
    private readonly OllamaSettings _providerSettings;
    private readonly StructuredOutputSettings _structuredSettings;
    private readonly ILogger<OllamaStructuredOutputService> _logger;
    private readonly OllamaApiClient? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public OllamaStructuredOutputService(
        IOptions<AIProvidersSettings> providerSettings,
        IOptions<StructuredOutputSettings> structuredSettings,
        ILogger<OllamaStructuredOutputService> logger)
    {
        _providerSettings = providerSettings.Value.Ollama;
        _structuredSettings = structuredSettings.Value;
        _logger = logger;

        if (_providerSettings.Enabled)
        {
            try
            {
                _client = new OllamaApiClient(new Uri(_providerSettings.BaseUrl))
                {
                    SelectedModel = _structuredSettings.Providers.Ollama.Model ?? _providerSettings.DefaultModel
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Ollama client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public string ProviderName => "Ollama";

    /// <inheritdoc />
    public bool IsAvailable =>
        _providerSettings.Enabled &&
        _structuredSettings.Providers.Ollama.Enabled &&
        _client != null;

    /// <inheritdoc />
    public async Task<StructuredOutputResult<T>> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions options,
        CancellationToken cancellationToken = default) where T : class
    {
        var modelName = options.Model ?? _structuredSettings.Providers.Ollama.Model ?? _providerSettings.DefaultModel;

        var result = new StructuredOutputResult<T>
        {
            Provider = ProviderName,
            Model = modelName
        };

        if (!IsAvailable)
        {
            result.Success = false;
            result.Error = "Ollama structured output service is not available";
            return result;
        }

        try
        {
            // Build the schema from the type
            var jsonSchema = JsonSchemaBuilder.FromType<T>();

            // Convert to system prompt instruction
            var schemaInstruction = OllamaSchemaAdapter.CombineWithSystemInstruction(
                jsonSchema,
                options.SystemInstruction);

            // Build messages
            var messages = new List<Message>
            {
                new Message
                {
                    Role = ChatRole.System,
                    Content = schemaInstruction
                },
                new Message
                {
                    Role = ChatRole.User,
                    Content = prompt
                }
            };

            // Build chat request with JSON format
            var request = new ChatRequest
            {
                Model = modelName,
                Messages = messages,
                Format = "json", // Enable JSON mode
                Options = new RequestOptions
                {
                    Temperature = options.Temperature
                },
                Stream = false
            };

            _logger.LogDebug("Generating Ollama structured output for type {Type} with model {Model}",
                typeof(T).Name, modelName);

            // Generate completion
            string fullResponse = "";
            await foreach (var response in _client!.ChatAsync(request, cancellationToken))
            {
                if (response?.Message?.Content != null)
                {
                    fullResponse += response.Message.Content;
                }
            }

            if (string.IsNullOrEmpty(fullResponse))
            {
                result.Success = false;
                result.Error = "Ollama returned empty response";
                return result;
            }

            result.RawResponse = fullResponse;

            // Clean up the response - sometimes models add markdown code blocks
            var cleanedResponse = CleanJsonResponse(fullResponse);

            // Parse JSON response
            var parsed = JsonSerializer.Deserialize<T>(cleanedResponse, JsonOptions);

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
            _logger.LogError(ex, "Failed to parse Ollama structured output as {Type}. Raw response: {Response}",
                typeof(T).Name, result.RawResponse);
            result.Success = false;
            result.Error = $"JSON parsing error: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from Ollama");
            result.Success = false;
            result.Error = ex.Message;
            return result;
        }
    }

    /// <summary>
    /// Clean up JSON response that may have markdown formatting.
    /// Some models wrap JSON in ```json ... ``` code blocks.
    /// </summary>
    private static string CleanJsonResponse(string response)
    {
        var trimmed = response.Trim();

        // Check for markdown JSON code block
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            var endIndex = trimmed.IndexOf("```", 7);
            if (endIndex > 7)
            {
                return trimmed.Substring(7, endIndex - 7).Trim();
            }
        }

        // Check for generic code block
        if (trimmed.StartsWith("```"))
        {
            var startIndex = trimmed.IndexOf('\n') + 1;
            var endIndex = trimmed.LastIndexOf("```");
            if (startIndex > 0 && endIndex > startIndex)
            {
                return trimmed.Substring(startIndex, endIndex - startIndex).Trim();
            }
        }

        return trimmed;
    }
}
