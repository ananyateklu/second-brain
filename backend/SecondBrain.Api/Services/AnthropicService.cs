using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.DTOs.Anthropic;

namespace SecondBrain.Api.Services
{
    public class AnthropicService : IAnthropicService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AnthropicService> _logger;
        private string? _apiKey;
        private readonly string _requestUri;
        private const string TITLE_KEY = "title";
        private const string CONTENT_KEY = "content";

        public AnthropicService(HttpClient httpClient, IConfiguration configuration, ILogger<AnthropicService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Anthropic:ApiKey"] ??
                throw new ArgumentException("Anthropic API key not configured");
            _requestUri = configuration["Anthropic:ApiEndpoint"] ??
                throw new ArgumentException("Anthropic API endpoint not configured");
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                var testRequest = new SendMessageRequest
                {
                    Model = "claude-3-5-sonnet-20241022",
                    MaxTokens = 1024,
                    Messages = new List<Message>
                    {
                        new Message { Role = "user", Content = "Hello, Claude!" }
                    },
                    Tools = new List<Tool>()
                };
                var testResponse = await SendMessageAsync(testRequest);
                return testResponse.Content != null && testResponse.Content.Any();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test connection to Claude API.");
                return false;
            }
        }

        public async Task<bool> SetApiKeyAsync(string apiKey)
        {
            // Securely store the API key, e.g., in a secure database or environment variable
            // For demonstration, we'll set it in-memory (not recommended for production)
            _apiKey = apiKey;
            // Optionally, test the connection after setting the key
            return await TestConnectionAsync();
        }

        public async Task<SendMessageResponse> SendMessageAsync(SendMessageRequest requestPayload)
        {
            if (requestPayload == null || string.IsNullOrEmpty(requestPayload.Model) || requestPayload.Messages == null || !requestPayload.Messages.Any())
            {
                throw new ArgumentException("Model and messages are required.");
            }

            var jsonOptions = new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var json = JsonSerializer.Serialize(requestPayload, jsonOptions);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");

            // Set the required headers
            _httpClient.DefaultRequestHeaders.Clear(); // Clear existing headers to avoid duplication
            if (_apiKey == null)
            {
                throw new InvalidOperationException("API key not configured");
            }
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
            _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            try
            {
                _logger.LogInformation("Sending message to Claude. Model: {ModelId}", requestPayload.Model);
                _logger.LogDebug("Request Payload: {RequestPayload}", json); // Log the full request

                var response = await _httpClient.PostAsync(_requestUri, httpContent);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received response from Claude.");
                _logger.LogDebug("Response Content: {ResponseContent}", responseString); // Log the full response

                if (response.IsSuccessStatusCode)
                {
                    var sendMessageResponse = JsonSerializer.Deserialize<SendMessageResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? throw new AnthropicException("Failed to deserialize response");

                    // Check for tool_use in the response
                    if (sendMessageResponse.StopReason == "tool_use")
                    {
                        _logger.LogInformation("Claude requested to use a tool.");
                        var toolUseContent = sendMessageResponse.Content?.FirstOrDefault(c => c.Type == "tool_use");
                        if (toolUseContent != null)
                        {
                            _logger.LogInformation("Tool Use Detected: {ToolName}", toolUseContent.Name);
                            _logger.LogDebug("Tool Use Content: {ToolUseContent}", JsonSerializer.Serialize(toolUseContent));
                            // Execute the tool
                            var toolResultContent = await ExecuteToolAsync(toolUseContent);

                            // Prepare the tool_result message
                            var toolResultMessage = new SendMessageRequest
                            {
                                Model = requestPayload.Model,
                                MaxTokens = requestPayload.MaxTokens,
                                Messages = new List<Message>
                                {
                                    new Message
                                    {
                                        Role = "user",
                                        Content = JsonSerializer.Serialize(new List<ContentBlock> { toolResultContent }, jsonOptions)
                                    }
                                },
                                Tools = new List<Tool>()
                            };

                            // Send the tool_result back to Claude
                            return await SendMessageAsync(toolResultMessage);
                        }
                    }

                    // Log final assistant response
                    _logger.LogInformation("Final response from Claude received.");
                    _logger.LogDebug("Assistant Response: {AssistantResponse}", JsonSerializer.Serialize(sendMessageResponse));

                    return sendMessageResponse;
                }
                else
                {
                    // Deserialize the error response
                    var errorResponse = JsonSerializer.Deserialize<AnthropicErrorResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    _logger.LogError("Claude API Error: {StatusCode} - {ErrorMessage}", response.StatusCode, errorResponse?.Error?.Message);
                    throw new AnthropicException($"Claude API Error: {response.StatusCode} - {errorResponse?.Error?.Message}");
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP Request Exception while sending message to Claude.");
                throw new AnthropicException($"Failed to communicate with Claude API: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Exception while sending message to Claude.");
                throw new AnthropicException($"Unexpected error while processing Claude request: {ex.Message}", ex);
            }
        }

        // Add a method to execute the tool
        private async Task<ContentBlock> ExecuteToolAsync(ContentBlock toolUseContent)
        {
            var toolName = toolUseContent.Name;
            var toolInputJson = toolUseContent.Input?.ToString()
                ?? throw new ArgumentException("Tool input is null");
            _logger.LogInformation("Executing tool: {ToolName}", toolName);
            _logger.LogDebug("Tool Input JSON: {ToolInputJson}", toolInputJson);

            var toolInput = JsonSerializer.Deserialize<Dictionary<string, object>>(toolInputJson)
                ?? throw new ArgumentException("Failed to deserialize tool input");

            object resultContent;
            bool isError = false;

            try
            {
                switch (toolName)
                {
                    case "generate_content":
                        resultContent = await GenerateContentAsync(toolInput);
                        break;
                    case "generate_title":
                        resultContent = await GenerateTitleAsync(toolInput);
                        break;
                    case "generate_tags":
                        resultContent = await GenerateTagsAsync(toolInput);
                        break;
                    default:
                        isError = true;
                        resultContent = $"Tool '{toolName}' is not implemented.";
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
                isError = true;
                resultContent = ex.Message;
            }

            // Prepare the tool_result content block
            var toolResultContent = new ContentBlock
            {
                Type = "tool_result",
                ToolUseId = toolUseContent.Id,
                Content = resultContent,
                IsError = isError
            };

            return toolResultContent;
        }

        private async Task<object> GenerateContentAsync(Dictionary<string, object> input)
        {
            try
            {
                return await Task.Run(() =>
                {
                    ValidateInput(input, out string title, out List<string> tags);
                    var contentBuilder = new StringBuilder();
                    
                    AppendHeader(contentBuilder, title, tags);
                    AppendActionPlan(contentBuilder, title);
                    ApplyTagSpecificModifications(contentBuilder, tags);
                    AppendResources(contentBuilder, title);
                    AppendConclusion(contentBuilder, title);

                    return new { content = contentBuilder.ToString() };
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating content");
                throw new AnthropicException("Failed to generate content", ex);
            }
        }

        private static void ValidateInput(Dictionary<string, object> input, out string title, out List<string> tags)
        {
            title = input.ContainsKey(TITLE_KEY) ? input[TITLE_KEY]?.ToString() ?? string.Empty : string.Empty;
            tags = input.ContainsKey("tags") 
                ? ((JsonElement)input["tags"]).EnumerateArray()
                    .Select(e => e.GetString())
                    .Where(s => s != null)
                    .Select(s => s!)
                    .ToList() 
                : new List<string>();

            if (string.IsNullOrEmpty(title))
            {
                throw new ArgumentException("'title' is required to generate content.");
            }
        }

        private static void AppendHeader(StringBuilder builder, string title, List<string> tags)
        {
            builder.AppendLine($"# {title}");
            builder.AppendLine();
            builder.AppendLine("## Introduction");
            builder.AppendLine($"This document provides a comprehensive plan for **{title}**.");
            builder.AppendLine();

            if (tags?.Any() == true)
            {
                builder.AppendLine("### Tags");
                builder.AppendLine($"Relevant tags: {string.Join(", ", tags)}.");
                builder.AppendLine();
            }
        }

        private static void AppendActionPlan(StringBuilder builder, string title)
        {
            builder.AppendLine("## Action Plan");
            builder.AppendLine("1. **Define Objectives**");
            builder.AppendLine($"   - Clearly outline what you aim to achieve with **{title}**.");
            builder.AppendLine("   - Identify key success metrics.");
            builder.AppendLine();

            builder.AppendLine("2. **Conduct Research**");
            builder.AppendLine($"   - Gather information related to **{title}**.");
            builder.AppendLine("   - Explore best practices and case studies.");
            builder.AppendLine("   - Useful resources:");
            builder.AppendLine("     - [Resource 1](https://example.com/resource1)");
            builder.AppendLine("     - [Resource 2](https://example.com/resource2)");
            builder.AppendLine();

            builder.AppendLine("3. **Plan Development**");
            builder.AppendLine("   - Create a detailed plan with timelines and milestones.");
            builder.AppendLine("   - Allocate necessary resources and assign responsibilities.");
            builder.AppendLine();

            builder.AppendLine("4. **Implementation**");
            builder.AppendLine($"   - Execute the plan for **{title}**.");
            builder.AppendLine("   - Monitor progress regularly.");
            builder.AppendLine("   - Address any challenges promptly.");
            builder.AppendLine();

            builder.AppendLine("5. **Evaluation and Feedback**");
            builder.AppendLine("   - Assess the outcomes against the objectives.");
            builder.AppendLine("   - Collect feedback from stakeholders.");
            builder.AppendLine("   - Document lessons learned.");
            builder.AppendLine();
        }

        private static void ApplyTagSpecificModifications(StringBuilder builder, List<string> tags)
        {
            if (tags?.Contains("Urgent", StringComparer.OrdinalIgnoreCase) == true)
            {
                builder.AppendLine("**Note:** This action plan is marked as **urgent**. Prioritize tasks accordingly and consider accelerating timelines where possible.");
                builder.AppendLine();
            }

            if (tags?.Contains("Idea", StringComparer.OrdinalIgnoreCase) == true)
            {
                builder.Replace("Implementation", "Prototype Development");
            }
        }

        private static void AppendResources(StringBuilder builder, string title)
        {
            var resources = GetRelevantResources(title.Replace(" ", "-").ToLower());
            builder.AppendLine("## Additional Resources");
            foreach (var resource in resources)
            {
                builder.AppendLine($"- [{resource}]({resource})");
            }
        }

        private static void AppendConclusion(StringBuilder builder, string title)
        {
            builder.AppendLine("## Conclusion");
            builder.AppendLine($"By following this plan, you'll be well on your way to successfully **{title.ToLower()}**. Remember to stay adaptable and refine your approach as needed.");
        }

        private async Task<object> GenerateTitleAsync(Dictionary<string, object> input)
        {
            try
            {
                return await Task.Run(() =>
                {
                    var content = input.ContainsKey(CONTENT_KEY) ? input[CONTENT_KEY]?.ToString() : null;
                    var tags = input.ContainsKey("tags") ? ((JsonElement)input["tags"]).EnumerateArray().Select(e => e.GetString()).ToList() : null;

                    string? title = null;

                    if (!string.IsNullOrEmpty(content))
                    {
                        title = SummarizeContentIntoTitle(content);
                    }
                    else if (tags != null && tags.Any())
                    {
                        title = $"About {string.Join(" and ", tags)}";
                    }

                    if (string.IsNullOrEmpty(title))
                    {
                        throw new ArgumentException("At least one of 'content' or 'tags' must be provided to generate a title.");
                    }

                    return new { title = title.Trim() };
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating title");
                throw new AnthropicException("Failed to generate title", ex);
            }
        }

        private static string SummarizeContentIntoTitle(string content)
        {
            // Implement summarization logic here
            var firstSentence = content.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return firstSentence?.Trim() ?? "Untitled";
        }

        private async Task<object> GenerateTagsAsync(Dictionary<string, object> input)
        {
            try
            {
                return await Task.Run(() =>
                {
                    var title = input.ContainsKey(TITLE_KEY) ? input[TITLE_KEY]?.ToString() ?? string.Empty : string.Empty;
                    var content = input.ContainsKey(CONTENT_KEY) ? input[CONTENT_KEY]?.ToString() ?? string.Empty : string.Empty;

                    var textToAnalyze = $"{title} {content}".Trim();

                    if (string.IsNullOrEmpty(textToAnalyze))
                    {
                        throw new ArgumentException("At least one of 'title' or 'content' must be provided to generate tags.");
                    }

                    var tags = ExtractKeywords(textToAnalyze);

                    return new { tags };
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating tags");
                throw new AnthropicException("Failed to generate tags", ex);
            }
        }

        private static List<string> ExtractKeywords(string text)
        {
            // Simple keyword extraction logic
            var words = text.Split(new[] { ' ', '.', ',', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
            var commonWords = new HashSet<string> { "the", "and", "a", "to", "is", "in", "it", "you", "of", "this", "that" };
            var significantWords = words.Where(w => w.Length > 3 && !commonWords.Contains(w.ToLower()));
            return significantWords.Distinct(StringComparer.OrdinalIgnoreCase).Take(5).ToList();
        }

        private static List<string> GetRelevantResources(string topic)
        {
            // Implement logic to fetch relevant resource links based on the topic
            // This could involve calling an external API or querying a database
            return new List<string>
            {
                $"https://example.com/{topic}-guide",
                $"https://example.com/{topic}-best-practices",
                $"https://example.com/{topic}-resources"
            };
        }

        // Helper to get the base URI for Anthropic API (e.g., https://api.anthropic.com/v1)
        private string GetApiBaseUri()
        {
            // Assuming _requestUri is like "https://api.anthropic.com/v1/messages"
            var messagesSegment = "/messages";
            if (_requestUri.EndsWith(messagesSegment))
            {
                return _requestUri.Substring(0, _requestUri.Length - messagesSegment.Length);
            }
            // Fallback or error if the URI format is unexpected
            _logger.LogWarning("Anthropic API endpoint URI '{RequestUri}' does not end with '/messages'. Using it as base URI, which might be incorrect for models endpoint.", _requestUri);
            return _requestUri; // Or throw an exception if this is critical
        }

        public async Task<AnthropicModelsResponse> GetModelsAsync()
        {
            var baseUri = GetApiBaseUri();
            var modelsRequestUri = $"{baseUri}/models";

            _logger.LogInformation("Fetching models from Anthropic API at {ModelsRequestUri}", modelsRequestUri);

            var request = new HttpRequestMessage(HttpMethod.Get, modelsRequestUri);

            _httpClient.DefaultRequestHeaders.Clear();
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("Anthropic API key not configured.");
            }
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
            _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01"); // Or a more recent version if available

            try
            {
                var response = await _httpClient.SendAsync(request);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received model list response from Anthropic API.");
                _logger.LogDebug("Models Response Content: {ResponseContent}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    var modelsResponse = JsonSerializer.Deserialize<AnthropicModelsResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    if (modelsResponse == null)
                    {
                        _logger.LogError("Failed to deserialize Anthropic models response. Response string was: {ResponseContent}", responseString);
                        throw new AnthropicException("Failed to deserialize models response from Anthropic API.");
                    }
                    return modelsResponse;
                }
                else
                {
                    var errorResponse = JsonSerializer.Deserialize<AnthropicErrorResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    var errorMessage = errorResponse?.Error?.Message ?? "Unknown error";
                    _logger.LogError("Anthropic API Error while fetching models: {StatusCode} - {ErrorMessage}", response.StatusCode, errorMessage);
                    throw new AnthropicException($"Anthropic API Error fetching models: {response.StatusCode} - {errorMessage}");
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP Request Exception while fetching models from Anthropic API.");
                throw new AnthropicException($"Failed to communicate with Anthropic API to fetch models: {ex.Message}", ex);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON Deserialization Exception while fetching models from Anthropic API.");
                throw new AnthropicException($"Failed to parse models response from Anthropic API: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Exception while fetching models from Anthropic API.");
                throw new AnthropicException($"Unexpected error while fetching Anthropic models: {ex.Message}", ex);
            }
        }
    }
}
