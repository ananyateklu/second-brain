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
/// Grok/XAI implementation of structured output using JSON schema response format.
/// Grok uses an OpenAI-compatible API, so this implementation is similar to OpenAI.
/// </summary>
public class GrokStructuredOutputService : IProviderStructuredOutputService
{
    private readonly XAISettings _providerSettings;
    private readonly StructuredOutputSettings _structuredSettings;
    private readonly ILogger<GrokStructuredOutputService> _logger;
    private readonly ChatClient? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public GrokStructuredOutputService(
        IOptions<AIProvidersSettings> providerSettings,
        IOptions<StructuredOutputSettings> structuredSettings,
        ILogger<GrokStructuredOutputService> logger)
    {
        _providerSettings = providerSettings.Value.XAI;
        _structuredSettings = structuredSettings.Value;
        _logger = logger;

        if (_providerSettings.Enabled && !string.IsNullOrWhiteSpace(_providerSettings.ApiKey))
        {
            try
            {
                var modelToUse = _structuredSettings.Providers.Grok.Model ?? _providerSettings.DefaultModel;

                // Create OpenAI client with Grok endpoint
                var apiKeyCredential = new System.ClientModel.ApiKeyCredential(_providerSettings.ApiKey);
                var openAIClientOptions = new OpenAIClientOptions
                {
                    Endpoint = new Uri(_providerSettings.BaseUrl)
                };

                var openAIClient = new OpenAIClient(apiKeyCredential, openAIClientOptions);
                _client = openAIClient.GetChatClient(modelToUse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Grok client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public string ProviderName => "Grok";

    /// <inheritdoc />
    public bool IsAvailable =>
        _providerSettings.Enabled &&
        _structuredSettings.Providers.Grok.Enabled &&
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
            Model = options.Model ?? _structuredSettings.Providers.Grok.Model ?? _providerSettings.DefaultModel
        };

        if (!IsAvailable)
        {
            result.Success = false;
            result.Error = "Grok structured output service is not available";
            return result;
        }

        try
        {
            // Build the schema from the type
            var schema = JsonSchemaBuilder.FromType<T>();
            var schemaBinaryData = GrokSchemaAdapter.ToBinaryData(schema);

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

            _logger.LogDebug("Generating Grok structured output for type {Type} with model {Model}",
                typeof(T).Name, result.Model);

            // Use the correct model if specified in options
            ChatClient client;
            if (!string.IsNullOrEmpty(options.Model) && options.Model != _providerSettings.DefaultModel)
            {
                var apiKeyCredential = new System.ClientModel.ApiKeyCredential(_providerSettings.ApiKey!);
                var openAIClientOptions = new OpenAIClientOptions
                {
                    Endpoint = new Uri(_providerSettings.BaseUrl)
                };
                var openAIClient = new OpenAIClient(apiKeyCredential, openAIClientOptions);
                client = openAIClient.GetChatClient(options.Model);
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
                result.Error = "Grok returned empty response";
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
            _logger.LogError(ex, "Failed to parse Grok structured output as {Type}", typeof(T).Name);
            result.Success = false;
            result.Error = $"JSON parsing error: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from Grok");
            result.Success = false;
            result.Error = ex.Message;
            return result;
        }
    }
}
