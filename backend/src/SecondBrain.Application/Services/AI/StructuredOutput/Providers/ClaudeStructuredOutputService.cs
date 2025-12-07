using System.Text.Json;
using System.Text.Json.Nodes;
using Anthropic.SDK;
using Anthropic.SDK.Common;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput.Adapters;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Providers;

/// <summary>
/// Claude/Anthropic implementation of structured output using tool forcing.
/// Claude doesn't have native JSON schema mode, so we use tool forcing to guarantee structured output.
/// </summary>
public class ClaudeStructuredOutputService : IProviderStructuredOutputService
{
    private readonly AnthropicSettings _providerSettings;
    private readonly StructuredOutputSettings _structuredSettings;
    private readonly ILogger<ClaudeStructuredOutputService> _logger;
    private readonly AnthropicClient? _client;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ClaudeStructuredOutputService(
        IOptions<AIProvidersSettings> providerSettings,
        IOptions<StructuredOutputSettings> structuredSettings,
        ILogger<ClaudeStructuredOutputService> logger)
    {
        _providerSettings = providerSettings.Value.Anthropic;
        _structuredSettings = structuredSettings.Value;
        _logger = logger;

        if (_providerSettings.Enabled && !string.IsNullOrWhiteSpace(_providerSettings.ApiKey))
        {
            try
            {
                _client = new AnthropicClient(_providerSettings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Anthropic client for structured output");
            }
        }
    }

    /// <inheritdoc />
    public string ProviderName => "Anthropic";

    /// <inheritdoc />
    public bool IsAvailable =>
        _providerSettings.Enabled &&
        _structuredSettings.Providers.Anthropic.Enabled &&
        _client != null;

    /// <inheritdoc />
    public async Task<StructuredOutputResult<T>> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions options,
        CancellationToken cancellationToken = default) where T : class
    {
        var modelName = options.Model ?? _structuredSettings.Providers.Anthropic.Model ?? _providerSettings.DefaultModel;

        var result = new StructuredOutputResult<T>
        {
            Provider = ProviderName,
            Model = modelName
        };

        if (!IsAvailable)
        {
            result.Success = false;
            result.Error = "Anthropic/Claude structured output service is not available";
            return result;
        }

        try
        {
            // Build the schema from the type
            var jsonSchema = JsonSchemaBuilder.FromType<T>();

            // Convert to Claude tool parameters format
            var toolParameters = ClaudeSchemaAdapter.ToToolParameters(jsonSchema);

            // Create a JsonNode from the tool parameters for the Function constructor
            var schemaJson = JsonSerializer.Serialize(toolParameters);
            var schemaNode = JsonNode.Parse(schemaJson)!;

            // Create the output tool
            var toolName = ClaudeSchemaAdapter.GetToolName();
            var toolDescription = ClaudeSchemaAdapter.GetToolDescription();
            var function = new Function(toolName, toolDescription, schemaNode);
            var tool = new Anthropic.SDK.Common.Tool(function);

            // Build messages
            var messages = new List<Message>
            {
                new Message(RoleType.User, prompt)
            };

            // Build system messages if provided
            var systemMessages = new List<SystemMessage>();
            if (!string.IsNullOrEmpty(options.SystemInstruction))
            {
                systemMessages.Add(new SystemMessage(options.SystemInstruction));
            }

            // Add instruction to use the tool
            systemMessages.Add(new SystemMessage(
                $"You must use the '{toolName}' tool to provide your response. Do not include any text outside of the tool call."));

            // Build message parameters with tool forcing
            var parameters = new MessageParameters
            {
                Messages = messages,
                Model = modelName,
                MaxTokens = options.MaxTokens ?? _providerSettings.MaxTokens,
                Temperature = (decimal)options.Temperature,
                Tools = new List<Anthropic.SDK.Common.Tool> { tool },
                ToolChoice = new ToolChoice
                {
                    Type = ToolChoiceType.Tool,
                    Name = toolName
                }
            };

            if (systemMessages.Count > 0)
            {
                parameters.System = systemMessages;
            }

            _logger.LogDebug("Generating Claude structured output for type {Type} with model {Model}",
                typeof(T).Name, modelName);

            // Generate completion (non-streaming for tool forcing)
            var response = await _client!.Messages.GetClaudeMessageAsync(parameters, cancellationToken);

            // Track token usage
            if (response.Usage != null)
            {
                result.InputTokens = response.Usage.InputTokens;
                result.OutputTokens = response.Usage.OutputTokens;
            }

            // Find the tool use content in the response
            ToolUseContent? toolUse = null;
            foreach (var content in response.Content)
            {
                if (content is ToolUseContent tuc && tuc.Name == toolName)
                {
                    toolUse = tuc;
                    break;
                }
            }

            if (toolUse == null)
            {
                result.Success = false;
                result.Error = "Claude did not use the structured output tool as expected";
                return result;
            }

            // Extract the tool input as the structured output
            var inputJson = toolUse.Input?.ToJsonString();
            if (string.IsNullOrEmpty(inputJson))
            {
                result.Success = false;
                result.Error = "Claude tool input was empty";
                return result;
            }

            result.RawResponse = inputJson;

            // Parse JSON response
            var parsed = JsonSerializer.Deserialize<T>(inputJson, JsonOptions);

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
            _logger.LogError(ex, "Failed to parse Claude structured output as {Type}", typeof(T).Name);
            result.Success = false;
            result.Error = $"JSON parsing error: {ex.Message}";
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating structured output from Claude");
            result.Success = false;
            result.Error = ex.Message;
            return result;
        }
    }
}
