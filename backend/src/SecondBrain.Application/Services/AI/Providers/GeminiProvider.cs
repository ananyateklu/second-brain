using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Telemetry;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

/// <summary>
/// Options for enabling Gemini-specific features per request
/// </summary>
public class GeminiFeatureOptions
{
    /// <summary>
    /// Enable Google Search grounding for real-time information
    /// </summary>
    public bool EnableGrounding { get; set; }

    /// <summary>
    /// Enable Python code execution in secure sandbox
    /// </summary>
    public bool EnableCodeExecution { get; set; }

    /// <summary>
    /// Enable thinking mode for extended reasoning
    /// </summary>
    public bool EnableThinking { get; set; }

    /// <summary>
    /// Thinking budget (max tokens for thinking process)
    /// </summary>
    public int? ThinkingBudget { get; set; }

    /// <summary>
    /// Function declarations for native function calling
    /// </summary>
    public List<FunctionDeclaration>? FunctionDeclarations { get; set; }

    /// <summary>
    /// Name of a cached content to use for this request (e.g., "cachedContents/abc123").
    /// When set, the cached context is prepended to the conversation, reducing latency and costs.
    /// </summary>
    public string? CachedContentName { get; set; }
}

/// <summary>
/// Event types for Gemini streaming responses
/// </summary>
public enum GeminiStreamEventType
{
    /// <summary>Text content being streamed</summary>
    Text,
    /// <summary>Thinking/reasoning process (for thinking mode)</summary>
    Thinking,
    /// <summary>Function calls requested by the model</summary>
    FunctionCalls,
    /// <summary>Grounding sources from Google Search</summary>
    GroundingSources,
    /// <summary>Code execution result</summary>
    CodeExecution,
    /// <summary>Stream completed</summary>
    Complete,
    /// <summary>Error occurred</summary>
    Error
}

/// <summary>
/// Event emitted during Gemini streaming
/// </summary>
public class GeminiStreamEvent
{
    /// <summary>Type of the event</summary>
    public GeminiStreamEventType Type { get; set; }

    /// <summary>Text content (for Text, Thinking, Complete, Error types)</summary>
    public string? Text { get; set; }

    /// <summary>Error message (for Error type)</summary>
    public string? Error { get; set; }

    /// <summary>Function calls (for FunctionCalls type)</summary>
    public List<FunctionCallInfo>? FunctionCalls { get; set; }

    /// <summary>Grounding sources (for GroundingSources type)</summary>
    public List<Models.GroundingSource>? GroundingSources { get; set; }

    /// <summary>Code execution result (for CodeExecution type)</summary>
    public Models.CodeExecutionResult? CodeExecutionResult { get; set; }
}

public class GeminiProvider : IAIProvider
{
    public const string HttpClientName = "Gemini";

    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly Client? _client;

    public string ProviderName => "Gemini";
    public bool IsEnabled => _settings.Enabled;

    public GeminiProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client");
            }
        }
    }

    private HttpClient CreateHttpClient()
    {
        return _httpClientFactory.CreateClient(HttpClientName);
    }

    /// <summary>
    /// Build generation config from settings with optional feature flags
    /// </summary>
    private GenerateContentConfig BuildGenerationConfig(
        int? maxTokens = null,
        float? temperature = null,
        GeminiFeatureOptions? features = null)
    {
        var config = new GenerateContentConfig
        {
            MaxOutputTokens = maxTokens ?? _settings.MaxTokens,
            Temperature = temperature ?? _settings.Temperature,
            TopP = _settings.TopP,
            TopK = _settings.TopK,
            SafetySettings = BuildSafetySettings()
        };

        // Apply feature-specific configurations
        if (features != null)
        {
            config.Tools ??= new List<Tool>();

            // Grounding with Google Search
            if (features.EnableGrounding || _settings.Features.EnableGrounding)
            {
                // Use simple Google Search grounding
                config.Tools.Add(new Tool { GoogleSearch = new GoogleSearch() });
            }

            // Code execution
            if (features.EnableCodeExecution || _settings.Features.EnableCodeExecution)
            {
                config.Tools.Add(new Tool { CodeExecution = new ToolCodeExecution() });
            }

            // Function calling
            if (features.FunctionDeclarations != null && features.FunctionDeclarations.Count > 0)
            {
                config.Tools.Add(new Tool
                {
                    FunctionDeclarations = features.FunctionDeclarations
                });
            }

            // Thinking mode (for Gemini 2.0+ models)
            if (features.EnableThinking || _settings.Features.EnableThinking)
            {
                var budget = features.ThinkingBudget ?? _settings.Thinking.DefaultBudget;
                budget = Math.Min(budget, _settings.Thinking.MaxBudget);
                config.ThinkingConfig = new ThinkingConfig
                {
                    ThinkingBudget = budget
                };
            }

            // Context caching - use cached content to reduce latency/costs
            if (!string.IsNullOrEmpty(features.CachedContentName))
            {
                config.CachedContent = features.CachedContentName;
            }

            // Clean up empty tools list
            if (config.Tools.Count == 0)
            {
                config.Tools = null;
            }
        }

        return config;
    }

    /// <summary>
    /// Build safety settings from configuration
    /// </summary>
    private List<SafetySetting> BuildSafetySettings()
    {
        return new List<SafetySetting>
        {
            new SafetySetting
            {
                Category = HarmCategory.HARM_CATEGORY_HARASSMENT,
                Threshold = ParseHarmThreshold(_settings.SafetySettings.Harassment)
            },
            new SafetySetting
            {
                Category = HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                Threshold = ParseHarmThreshold(_settings.SafetySettings.HateSpeech)
            },
            new SafetySetting
            {
                Category = HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                Threshold = ParseHarmThreshold(_settings.SafetySettings.SexualContent)
            },
            new SafetySetting
            {
                Category = HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                Threshold = ParseHarmThreshold(_settings.SafetySettings.DangerousContent)
            }
        };
    }

    /// <summary>
    /// Parse harm threshold from string configuration
    /// </summary>
    private static HarmBlockThreshold ParseHarmThreshold(string threshold)
    {
        return threshold?.ToLowerInvariant() switch
        {
            "blocknone" => HarmBlockThreshold.BLOCK_NONE,
            "blockonlyhigh" => HarmBlockThreshold.BLOCK_ONLY_HIGH,
            "blockmediumandabove" => HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            "blocklowandabove" => HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
            _ => HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        };
    }

    /// <summary>
    /// Extract text from GenerateContentResponse
    /// </summary>
    private static string ExtractText(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return string.Empty;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null || candidate.Content.Parts.Count == 0)
            return string.Empty;

        // Concatenate all text parts (excluding thinking parts)
        var textBuilder = new StringBuilder();
        foreach (var part in candidate.Content.Parts)
        {
            if (!string.IsNullOrEmpty(part?.Text) && part.Thought != true)
            {
                textBuilder.Append(part.Text);
            }
        }
        return textBuilder.ToString();
    }

    /// <summary>
    /// Extract grounding sources from response metadata
    /// </summary>
    private static List<Models.GroundingSource>? ExtractGroundingSources(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return null;

        var candidate = response.Candidates[0];
        var groundingMetadata = candidate?.GroundingMetadata;

        if (groundingMetadata?.GroundingChunks == null || groundingMetadata.GroundingChunks.Count == 0)
            return null;

        var sources = new List<Models.GroundingSource>();
        foreach (var chunk in groundingMetadata.GroundingChunks)
        {
            if (chunk?.Web != null)
            {
                sources.Add(new Models.GroundingSource
                {
                    Uri = chunk.Web.Uri ?? string.Empty,
                    Title = chunk.Web.Title ?? string.Empty
                });
            }
        }

        return sources.Count > 0 ? sources : null;
    }

    /// <summary>
    /// Extract code execution result from response parts
    /// </summary>
    private static Models.CodeExecutionResult? ExtractCodeExecutionResult(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return null;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null)
            return null;

        string? code = null;
        string? output = null;
        bool success = true;

        foreach (var part in candidate.Content.Parts)
        {
            if (part?.ExecutableCode != null)
            {
                code = part.ExecutableCode.Code;
            }
            if (part?.CodeExecutionResult != null)
            {
                output = part.CodeExecutionResult.Output;
                success = part.CodeExecutionResult.Outcome == Outcome.OUTCOME_OK;
            }
        }

        if (code == null && output == null)
            return null;

        return new Models.CodeExecutionResult
        {
            Code = code ?? string.Empty,
            Language = "python",
            Output = output ?? string.Empty,
            Success = success
        };
    }

    /// <summary>
    /// Extract thinking process from response (for thinking mode)
    /// </summary>
    private static string? ExtractThinkingProcess(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return null;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null)
            return null;

        var thinkingBuilder = new StringBuilder();
        foreach (var part in candidate.Content.Parts)
        {
            if (part?.Thought == true && !string.IsNullOrEmpty(part.Text))
            {
                thinkingBuilder.AppendLine(part.Text);
            }
        }

        var thinking = thinkingBuilder.ToString().Trim();
        return string.IsNullOrEmpty(thinking) ? null : thinking;
    }

    /// <summary>
    /// Extract function calls from response
    /// </summary>
    private static List<FunctionCallInfo>? ExtractFunctionCalls(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return null;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null)
            return null;

        var functionCalls = new List<FunctionCallInfo>();
        foreach (var part in candidate.Content.Parts)
        {
            if (part?.FunctionCall != null)
            {
                var argsJson = "{}";
                if (part.FunctionCall.Args != null)
                {
                    argsJson = JsonSerializer.Serialize(part.FunctionCall.Args);
                }

                functionCalls.Add(new FunctionCallInfo
                {
                    Name = part.FunctionCall.Name ?? string.Empty,
                    Arguments = argsJson,
                    Id = part.FunctionCall.Id
                });
            }
        }

        return functionCalls.Count > 0 ? functionCalls : null;
    }

    /// <summary>
    /// Build enhanced AIResponse with all extracted data
    /// </summary>
    private static AIResponse BuildEnhancedResponse(
        GenerateContentResponse? response,
        string modelName,
        string providerName,
        bool includeThinking = false)
    {
        var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

        return new AIResponse
        {
            Success = true,
            Content = ExtractText(response),
            Model = modelName,
            TokensUsed = tokensUsed,
            Provider = providerName,
            GroundingSources = ExtractGroundingSources(response),
            CodeExecutionResult = ExtractCodeExecutionResult(response),
            ThinkingProcess = includeThinking ? ExtractThinkingProcess(response) : null,
            FunctionCalls = ExtractFunctionCalls(response)
        };
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var modelName = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.GenerateCompletion", ProviderName, modelName);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var config = BuildGenerationConfig(request.MaxTokens, request.Temperature);

            var response = await _client.Models.GenerateContentAsync(
                model: modelName,
                contents: request.Prompt,
                config: config);

            stopwatch.Stop();
            var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = ExtractText(response),
                Model = modelName,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from Gemini");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.GenerateChatCompletion", ProviderName, modelName);
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature);

            // Separate system messages from conversation
            var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

            if (conversationMessages.Count == 0)
            {
                throw new InvalidOperationException("No conversation messages found");
            }

            // Add system instruction to config if present
            if (systemMessage != null)
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = systemMessage.Content } }
                };
            }

            // Check if the last message has images (multimodal)
            var lastMessage = conversationMessages.LastOrDefault();
            GenerateContentResponse? response;

            if (lastMessage?.Images != null && lastMessage.Images.Count > 0)
            {
                activity?.SetTag("ai.multimodal", true);
                activity?.SetTag("ai.images.count", lastMessage.Images.Count);

                // Build multimodal content with text and images
                var contents = BuildMultimodalContents(conversationMessages);

                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }
            else
            {
                // Build text-only contents
                var contents = BuildTextContents(conversationMessages);

                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }

            stopwatch.Stop();
            var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            var aiResponse = BuildEnhancedResponse(response, modelName, ProviderName, _settings.Thinking.IncludeThinkingInResponse);
            return aiResponse;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Gemini");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    /// <summary>
    /// Generate chat completion with advanced Gemini features (grounding, code execution, function calling)
    /// </summary>
    public async Task<AIResponse> GenerateWithFeaturesAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        GeminiFeatureOptions? features = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.GenerateWithFeatures", ProviderName, modelName);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.grounding", features?.EnableGrounding ?? _settings.Features.EnableGrounding);
        activity?.SetTag("ai.code_execution", features?.EnableCodeExecution ?? _settings.Features.EnableCodeExecution);
        activity?.SetTag("ai.thinking", features?.EnableThinking ?? _settings.Features.EnableThinking);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature, features);

            // Separate system messages from conversation
            var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

            if (conversationMessages.Count == 0)
            {
                throw new InvalidOperationException("No conversation messages found");
            }

            // Add system instruction to config if present
            if (systemMessage != null)
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = systemMessage.Content } }
                };
            }

            // Check if the last message has images (multimodal)
            var lastMessage = conversationMessages.LastOrDefault();
            GenerateContentResponse? response;

            if (lastMessage?.Images != null && lastMessage.Images.Count > 0)
            {
                activity?.SetTag("ai.multimodal", true);
                activity?.SetTag("ai.images.count", lastMessage.Images.Count);

                var contents = BuildMultimodalContents(conversationMessages);
                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }
            else
            {
                var contents = BuildTextContents(conversationMessages);
                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }

            stopwatch.Stop();
            var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return BuildEnhancedResponse(response, modelName, ProviderName,
                _settings.Thinking.IncludeThinkingInResponse || (features?.EnableThinking ?? false));
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion with features from Gemini");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    /// <summary>
    /// Continue a conversation after function call execution (for agent mode).
    /// Supports multiple function results sent back together as Gemini expects.
    /// </summary>
    public async Task<AIResponse> ContinueWithFunctionResultAsync(
        IEnumerable<Models.ChatMessage> messages,
        string functionName,
        object functionResult,
        AIRequest? settings = null,
        GeminiFeatureOptions? features = null,
        CancellationToken cancellationToken = default)
    {
        // Single result - delegate to multi-result method
        return await ContinueWithFunctionResultsAsync(
            messages,
            new[] { (functionName, functionResult) },
            settings,
            features,
            cancellationToken);
    }

    /// <summary>
    /// Continue a conversation after multiple function call executions.
    /// This is the proper Gemini pattern - all function results sent in one response.
    /// </summary>
    public async Task<AIResponse> ContinueWithFunctionResultsAsync(
        IEnumerable<Models.ChatMessage> messages,
        IEnumerable<(string FunctionName, object Result)> functionResults,
        AIRequest? settings = null,
        GeminiFeatureOptions? features = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        var resultsList = functionResults.ToList();

        try
        {
            var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature, features);

            // Separate system messages from conversation
            var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

            if (systemMessage != null)
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = systemMessage.Content } }
                };
            }

            // Build contents from conversation
            var contents = BuildTextContents(conversationMessages);

            // Add ALL function responses as parts in a single Content
            // This is the proper Gemini pattern for multi-function calls
            var functionResponseParts = new List<Part>();
            foreach (var (name, result) in resultsList)
            {
                var responseDict = new Dictionary<string, object>();
                if (result is Dictionary<string, object> dict)
                {
                    responseDict = dict;
                }
                else if (result != null)
                {
                    responseDict["result"] = result;
                }

                functionResponseParts.Add(new Part
                {
                    FunctionResponse = new FunctionResponse
                    {
                        Name = name,
                        Response = responseDict
                    }
                });
            }

            contents.Add(new Content
            {
                Role = "user", // Function responses are sent as user role in Gemini
                Parts = functionResponseParts
            });

            var response = await _client.Models.GenerateContentAsync(
                model: modelName,
                contents: contents,
                config: config);

            return BuildEnhancedResponse(response, modelName, ProviderName,
                _settings.Thinking.IncludeThinkingInResponse || (features?.EnableThinking ?? false));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error continuing conversation with function results");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    /// <summary>
    /// Stream chat completion with Gemini features, including function calling.
    /// Use for agentic scenarios where you want real-time text streaming.
    /// Note: Function calls will interrupt streaming and require continuation.
    /// </summary>
    public async IAsyncEnumerable<GeminiStreamEvent> StreamWithFeaturesAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        GeminiFeatureOptions? features = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            yield return new GeminiStreamEvent
            {
                Type = GeminiStreamEventType.Error,
                Error = "Gemini provider is not enabled or configured"
            };
            yield break;
        }

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();

        var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature, features);

        // Separate system messages from conversation
        var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
        var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

        if (conversationMessages.Count == 0)
        {
            yield return new GeminiStreamEvent
            {
                Type = GeminiStreamEventType.Error,
                Error = "No conversation messages found"
            };
            yield break;
        }

        if (systemMessage != null)
        {
            config.SystemInstruction = new Content
            {
                Parts = new List<Part> { new Part { Text = systemMessage.Content } }
            };
        }

        List<Content> contents;
        if (conversationMessages.LastOrDefault()?.Images != null &&
            conversationMessages.Last().Images!.Count > 0)
        {
            contents = BuildMultimodalContents(conversationMessages);
        }
        else
        {
            contents = BuildTextContents(conversationMessages);
        }

        var functionCalls = new List<FunctionCallInfo>();
        var textContent = new StringBuilder();

        await foreach (var chunk in _client.Models.GenerateContentStreamAsync(
            model: modelName,
            contents: contents,
            config: config))
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            // Extract function calls from the response
            var extractedCalls = ExtractFunctionCalls(chunk);
            if (extractedCalls != null && extractedCalls.Count > 0)
            {
                functionCalls.AddRange(extractedCalls);
            }

            // Extract and yield text
            var text = ExtractText(chunk);
            if (!string.IsNullOrEmpty(text))
            {
                textContent.Append(text);
                yield return new GeminiStreamEvent
                {
                    Type = GeminiStreamEventType.Text,
                    Text = text
                };
            }

            // Extract thinking process
            var thinking = ExtractThinkingProcess(chunk);
            if (!string.IsNullOrEmpty(thinking))
            {
                yield return new GeminiStreamEvent
                {
                    Type = GeminiStreamEventType.Thinking,
                    Text = thinking
                };
            }

            // Extract grounding sources
            var sources = ExtractGroundingSources(chunk);
            if (sources != null && sources.Count > 0)
            {
                yield return new GeminiStreamEvent
                {
                    Type = GeminiStreamEventType.GroundingSources,
                    GroundingSources = sources
                };
            }

            // Extract code execution
            var codeResult = ExtractCodeExecutionResult(chunk);
            if (codeResult != null)
            {
                yield return new GeminiStreamEvent
                {
                    Type = GeminiStreamEventType.CodeExecution,
                    CodeExecutionResult = codeResult
                };
            }
        }

        // Yield function calls at the end if any were detected
        if (functionCalls.Count > 0)
        {
            yield return new GeminiStreamEvent
            {
                Type = GeminiStreamEventType.FunctionCalls,
                FunctionCalls = functionCalls
            };
        }

        // Yield completion event
        yield return new GeminiStreamEvent
        {
            Type = GeminiStreamEventType.Complete,
            Text = textContent.ToString()
        };
    }

    public Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamCompletionInternalAsync(request, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var modelName = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.StreamCompletion", ProviderName, modelName);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var config = BuildGenerationConfig(request.MaxTokens, request.Temperature);

        var tokenCount = 0;
        await foreach (var chunk in _client.Models.GenerateContentStreamAsync(
            model: modelName,
            contents: request.Prompt,
            config: config))
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            var text = ExtractText(chunk);
            if (!string.IsNullOrEmpty(text))
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", modelName));
                }
                tokenCount++;
                yield return text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true);
    }

    public Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamChatCompletionInternalAsync(messages, settings, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.StreamChatCompletion", ProviderName, modelName);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature);

        // Separate system messages from conversation
        var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
        var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

        if (conversationMessages.Count == 0)
            yield break;

        // Add system instruction to config if present
        if (systemMessage != null)
        {
            config.SystemInstruction = new Content
            {
                Parts = new List<Part> { new Part { Text = systemMessage.Content } }
            };
        }

        var tokenCount = 0;

        // Check if the last message has images (multimodal)
        var lastMessage = conversationMessages.LastOrDefault();
        IAsyncEnumerable<GenerateContentResponse> streamResponse;

        if (lastMessage?.Images != null && lastMessage.Images.Count > 0)
        {
            activity?.SetTag("ai.multimodal", true);
            activity?.SetTag("ai.images.count", lastMessage.Images.Count);

            // Build multimodal content with text and images
            var contents = BuildMultimodalContents(conversationMessages);

            streamResponse = _client.Models.GenerateContentStreamAsync(
                model: modelName,
                contents: contents,
                config: config);
        }
        else
        {
            // Build text-only contents
            var contents = BuildTextContents(conversationMessages);

            streamResponse = _client.Models.GenerateContentStreamAsync(
                model: modelName,
                contents: contents,
                config: config);
        }

        await foreach (var chunk in streamResponse)
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            var text = ExtractText(chunk);
            if (!string.IsNullOrEmpty(text))
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", modelName));
                }
                tokenCount++;
                yield return text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Build text-only contents from conversation messages
    /// </summary>
    private static List<Content> BuildTextContents(List<Models.ChatMessage> conversationMessages)
    {
        var contents = new List<Content>();

        foreach (var msg in conversationMessages)
        {
            var role = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            contents.Add(new Content
            {
                Role = role,
                Parts = new List<Part> { new Part { Text = msg.Content } }
            });
        }

        return contents;
    }

    /// <summary>
    /// Build multimodal contents from conversation messages (with images)
    /// </summary>
    private static List<Content> BuildMultimodalContents(List<Models.ChatMessage> conversationMessages)
    {
        var contents = new List<Content>();

        foreach (var msg in conversationMessages)
        {
            var role = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            var parts = new List<Part> { new Part { Text = msg.Content } };

            // Add images if present
            if (msg.Images != null && msg.Images.Count > 0)
            {
                foreach (var image in msg.Images)
                {
                    // Convert base64 string to byte array
                    var imageBytes = Convert.FromBase64String(image.Base64Data);
                    parts.Add(new Part
                    {
                        InlineData = new Blob
                        {
                            MimeType = image.MediaType,
                            Data = imageBytes
                        }
                    });
                }
            }

            contents.Add(new Content
            {
                Role = role,
                Parts = parts
            });
        }

        return contents;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var config = new GenerateContentConfig
            {
                MaxOutputTokens = 5
            };

            var response = await _client.Models.GenerateContentAsync(
                model: _settings.DefaultModel,
                contents: "Hello",
                config: config);

            return response != null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini availability check failed");
            return false;
        }
    }

    private async Task<IEnumerable<string>> FetchAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models?key={_settings.ApiKey}",
                cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);

                if (jsonDoc.RootElement.TryGetProperty("models", out var modelsElement))
                {
                    return modelsElement.EnumerateArray()
                        .Where(model => model.TryGetProperty("name", out _))
                        .Select(model =>
                        {
                            var name = model.GetProperty("name").GetString() ?? string.Empty;
                            return name.Replace("models/", "");
                        })
                        .Where(name => !string.IsNullOrEmpty(name) && name.StartsWith("gemini"))
                        .OrderByDescending(name => name)
                        .ToList();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch available models from Gemini API");
        }

        // Fallback to known models if API call fails
        return new[]
        {
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
        };
    }

    public async Task<AIProviderHealth> GetHealthStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var health = new AIProviderHealth
        {
            Provider = ProviderName,
            CheckedAt = DateTime.UtcNow
        };

        if (!IsEnabled)
        {
            health.IsHealthy = false;
            health.Status = "Disabled";
            health.ErrorMessage = "Provider is disabled in configuration";
            return health;
        }

        if (_client == null)
        {
            health.IsHealthy = false;
            health.Status = "Not Configured";
            health.ErrorMessage = "API key not configured";
            return health;
        }

        try
        {
            var isAvailable = await IsAvailableAsync(cancellationToken);
            var availableModels = await FetchAvailableModelsAsync(cancellationToken);
            stopwatch.Stop();

            health.IsHealthy = isAvailable;
            health.Status = isAvailable ? "Healthy" : "Unavailable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.Version = "v1";
            health.AvailableModels = availableModels;

            if (!isAvailable)
            {
                health.ErrorMessage = "Failed to connect to Google Gemini API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Gemini health check failed");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }
}
