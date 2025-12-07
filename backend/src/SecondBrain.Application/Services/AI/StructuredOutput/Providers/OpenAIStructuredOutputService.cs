using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput.Adapters;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Providers;

/// <summary>
/// OpenAI implementation of structured output using JSON schema response format.
/// </summary>
public class OpenAIStructuredOutputService : IProviderStructuredOutputService
{
    private readonly OpenAISettings _providerSettings;
    private readonly StructuredOutputSettings _structuredSettings;
    private readonly ILogger<OpenAIStructuredOutputService> _logger;
    private readonly ChatClient? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public OpenAIStructuredOutputService(
        IOptions<AIProvidersSettings> providerSettings,
        IOptions<StructuredOutputSettings> structuredSettings,
        ILogger<OpenAIStructuredOutputService> logger)
    {
        _providerSettings = providerSettings.Value.OpenAI;
        _structuredSettings = structuredSettings.Value;
        _logger = logger;

        if (_providerSettings.Enabled && !string.IsNullOrWhiteSpace(_providerSettings.ApiKey))
        {
            try
            {
                var modelToUse = _structuredSettings.Providers.OpenAI.Model ?? _providerSettings.DefaultModel;
                _client = new ChatClient(modelToUse, _providerSettings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public string ProviderName => "OpenAI";

    /// <inheritdoc />
    public bool IsAvailable =>
        _providerSettings.Enabled &&
        _structuredSettings.Providers.OpenAI.Enabled &&
        _client != null;

    /// <inheritdoc />
    public async Task<StructuredOutputResult<T>> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions options,
        CancellationToken cancellationToken = default) where T : class
    {
        var result = new StructuredOutputResult<T>
        {
            Provider = ProviderName,
            Model = options.Model ?? _structuredSettings.Providers.OpenAI.Model ?? _providerSettings.DefaultModel
        };

        if (!IsAvailable)
        {
            result.Success = false;
            result.Error = "OpenAI structured output service is not available";
            return result;
        }

        try
        {
            // Build the schema from the type
            var schema = JsonSchemaBuilder.FromType<T>();
            var schemaBinaryData = OpenAISchemaAdapter.ToBinaryData(schema);

            // Build messages
            var messages = new List<ChatMessage>();

            if (!string.IsNullOrEmpty(options.SystemInstruction))
            {
                messages.Add(new SystemChatMessage(options.SystemInstruction));
            }

            messages.Add(new UserChatMessage(prompt));

            // Build chat options with JSON schema response format
            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = options.MaxTokens ?? _providerSettings.MaxTokens,
                ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                    jsonSchemaFormatName: typeof(T).Name,
                    jsonSchema: schemaBinaryData,
                    jsonSchemaIsStrict: options.StrictMode)
            };

            // Set temperature if non-zero
            var temperature = options.Temperature;
            if (temperature > 0)
            {
                chatOptions.Temperature = temperature;
            }

            _logger.LogDebug("Generating OpenAI structured output for type {Type} with model {Model}",
                typeof(T).Name, result.Model);

            // Use the correct model if specified in options
            ChatClient client;
            if (!string.IsNullOrEmpty(options.Model) && options.Model != _providerSettings.DefaultModel)
            {
                client = new ChatClient(options.Model, _providerSettings.ApiKey!);
            }
            else
            {
                client = _client!;
            }

            // Generate completion
            var completion = await client.CompleteChatAsync(messages, chatOptions, cancellationToken);

            // Extract text from response
            var responseText = completion.Value.Content
                .Where(c => c.Kind == ChatMessageContentPartKind.Text)
                .Select(c => c.Text)
                .FirstOrDefault();

            if (string.IsNullOrEmpty(responseText))
            {
                result.Success = false;
                result.Error = "OpenAI returned empty response";
                return result;
            }

            result.RawResponse = responseText;

            // Track token usage if available
            if (completion.Value.Usage != null)
            {
                result.InputTokens = completion.Value.Usage.InputTokenCount;
                result.OutputTokens = completion.Value.Usage.OutputTokenCount;
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
            _logger.LogError(ex, "Failed to parse OpenAI structured output as {Type}", typeof(T).Name);
            result.Success = false;
            result.Error = $"JSON parsing error: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from OpenAI");
            result.Success = false;
            result.Error = ex.Message;
            return result;
        }
    }
}
