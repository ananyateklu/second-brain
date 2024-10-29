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
        private readonly IConfiguration _configuration;
        private readonly ILogger<AnthropicService> _logger;
        private string _apiKey;
        private readonly string _requestUri = "https://api.anthropic.com/v1/messages";

        public AnthropicService(HttpClient httpClient, IConfiguration configuration, ILogger<AnthropicService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _apiKey = _configuration["Anthropic:ApiKey"];
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
                    }
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
                    });

                    // Check for tool_use in the response
                    if (sendMessageResponse.StopReason == "tool_use")
                    {
                        _logger.LogInformation("Claude requested to use a tool.");
                        var toolUseContent = sendMessageResponse.Content.FirstOrDefault(c => c.Type == "tool_use");
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
                                }
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
                throw new AnthropicException($"HTTP Request Exception: {ex.Message}");
            }
            catch (AnthropicException ex)
            {
                _logger.LogError(ex, "Anthropic Exception: {Message}", ex.Message);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Exception while sending message to Claude.");
                throw new AnthropicException($"Unexpected Exception: {ex.Message}");
            }
        }

        // Add a method to execute the tool
        private async Task<ContentBlock> ExecuteToolAsync(ContentBlock toolUseContent)
        {
            // Extract tool name and input
            var toolName = toolUseContent.Name;
            var toolInputJson = toolUseContent.Input.ToString();
            _logger.LogInformation("Executing tool: {ToolName}", toolName);
            _logger.LogDebug("Tool Input JSON: {ToolInputJson}", toolInputJson);

            var toolInput = JsonSerializer.Deserialize<Dictionary<string, object>>(toolInputJson);

            object resultContent = null;
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

        // Example implementation of the SuggestTitleAndTagsAsync method
        private async Task<object> SuggestTitleAndTagsAsync(Dictionary<string, object> input)
        {
            // Extract necessary input parameters from the input dictionary
            if (!input.TryGetValue("noteContent", out var noteContentObj) || noteContentObj == null)
            {
                throw new ArgumentException("The 'noteContent' parameter is required.");
            }

            var noteContent = noteContentObj.ToString();

            // Implement your logic to suggest titles and tags
            // For this example, let's assume we have some simple logic

            var suggestedTitle = GenerateTitle(noteContent);
            var suggestedTags = GenerateTags(noteContent);

            // Return the result as an object
            return new
            {
                title = suggestedTitle,
                tags = suggestedTags
            };
        }

        private string GenerateTitle(string content)
        {
            // Simple logic to generate a title (you can replace this with your own implementation)
            // For example, take the first sentence or the first few words
            var firstSentence = content.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return firstSentence?.Trim() ?? "Untitled Note";
        }

        private List<string> GenerateTags(string content)
        {
            // Simple logic to generate tags (you can replace this with your own implementation)
            // For example, extract keywords or use some NLP techniques
            var words = content.Split(new[] { ' ', '.', ',', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
            var commonWords = new HashSet<string> { "the", "and", "a", "to", "is", "in", "it", "you", "of" };
            var significantWords = words.Where(w => w.Length > 3 && !commonWords.Contains(w.ToLower()));
            return significantWords.Distinct(StringComparer.OrdinalIgnoreCase).Take(5).ToList();
        }

        private async Task<object> GenerateContentAsync(Dictionary<string, object> input)
        {
            var title = input.ContainsKey("title") ? input["title"]?.ToString() : null;
            var tags = input.ContainsKey("tags") ? ((JsonElement)input["tags"]).EnumerateArray().Select(e => e.GetString()).ToList() : null;

            if (string.IsNullOrEmpty(title))
            {
                throw new ArgumentException("'title' is required to generate content.");
            }

            // Generate dynamic content based on the title and tags
            var contentBuilder = new StringBuilder();

            contentBuilder.AppendLine($"# {title}");
            contentBuilder.AppendLine();

            // Introduction
            contentBuilder.AppendLine("## Introduction");
            contentBuilder.AppendLine($"This document provides a comprehensive plan for **{title}**.");
            contentBuilder.AppendLine();

            // Include tags if provided
            if (tags != null && tags.Any())
            {
                contentBuilder.AppendLine("### Tags");
                contentBuilder.AppendLine($"Relevant tags: {string.Join(", ", tags)}.");
                contentBuilder.AppendLine();
            }

            // Steps
            contentBuilder.AppendLine("## Action Plan");
            contentBuilder.AppendLine("1. **Define Objectives**");
            contentBuilder.AppendLine($"   - Clearly outline what you aim to achieve with **{title}**.");
            contentBuilder.AppendLine("   - Identify key success metrics.");
            contentBuilder.AppendLine();

            contentBuilder.AppendLine("2. **Conduct Research**");
            contentBuilder.AppendLine($"   - Gather information related to **{title}**.");
            contentBuilder.AppendLine("   - Explore best practices and case studies.");
            contentBuilder.AppendLine("   - Useful resources:");
            contentBuilder.AppendLine("     - [Resource 1](https://example.com/resource1)");
            contentBuilder.AppendLine("     - [Resource 2](https://example.com/resource2)");
            contentBuilder.AppendLine();

            contentBuilder.AppendLine("3. **Plan Development**");
            contentBuilder.AppendLine("   - Create a detailed plan with timelines and milestones.");
            contentBuilder.AppendLine("   - Allocate necessary resources and assign responsibilities.");
            contentBuilder.AppendLine();

            contentBuilder.AppendLine("4. **Implementation**");
            contentBuilder.AppendLine($"   - Execute the plan for **{title}**.");
            contentBuilder.AppendLine("   - Monitor progress regularly.");
            contentBuilder.AppendLine("   - Address any challenges promptly.");
            contentBuilder.AppendLine();

            contentBuilder.AppendLine("5. **Evaluation and Feedback**");
            contentBuilder.AppendLine("   - Assess the outcomes against the objectives.");
            contentBuilder.AppendLine("   - Collect feedback from stakeholders.");
            contentBuilder.AppendLine("   - Document lessons learned.");
            contentBuilder.AppendLine();

            if (tags != null && tags.Contains("Urgent", StringComparer.OrdinalIgnoreCase))
            {
                contentBuilder.AppendLine("**Note:** This action plan is marked as **urgent**. Prioritize tasks accordingly and consider accelerating timelines where possible.");
                contentBuilder.AppendLine();
            }

            if (tags != null && tags.Contains("Idea", StringComparer.OrdinalIgnoreCase))
            {
                // Modify the action plan steps for an idea
                contentBuilder.Replace("Implementation", "Prototype Development");
                // Update steps as necessary
            }

            var resources = GetRelevantResources(title.Replace(" ", "-").ToLower());
            contentBuilder.AppendLine("## Additional Resources");
            foreach (var resource in resources)
            {
                contentBuilder.AppendLine($"- [{resource}]({resource})");
            }

            // Conclusion
            contentBuilder.AppendLine("## Conclusion");
            contentBuilder.AppendLine($"By following this plan, you'll be well on your way to successfully **{title.ToLower()}**. Remember to stay adaptable and refine your approach as needed.");

            var content = contentBuilder.ToString();

            return new
            {
                content = content
            };
        }

        private async Task<object> GenerateTitleAsync(Dictionary<string, object> input)
        {
            var content = input.ContainsKey("content") ? input["content"]?.ToString() : null;
            var tags = input.ContainsKey("tags") ? ((JsonElement)input["tags"]).EnumerateArray().Select(e => e.GetString()).ToList() : null;

            // Logic to generate title based on content and/or tags
            string title = null;

            if (!string.IsNullOrEmpty(content))
            {
                // Extract a summary or key phrase from content
                title = SummarizeContentIntoTitle(content);
            }
            else if (tags != null && tags.Any())
            {
                // Create a title based on tags
                title = $"About {string.Join(" and ", tags)}";
            }

            if (string.IsNullOrEmpty(title))
            {
                throw new ArgumentException("At least one of 'content' or 'tags' must be provided to generate a title.");
            }

            return new
            {
                title = title.Trim()
            };
        }

        private string SummarizeContentIntoTitle(string content)
        {
            // Implement summarization logic here
            var firstSentence = content.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            return firstSentence?.Trim() ?? "Untitled";
        }

        private async Task<object> GenerateTagsAsync(Dictionary<string, object> input)
        {
            var title = input.ContainsKey("title") ? input["title"]?.ToString() : null;
            var content = input.ContainsKey("content") ? input["content"]?.ToString() : null;

            // Logic to generate tags based on title and/or content
            var textToAnalyze = $"{title} {content}".Trim();

            if (string.IsNullOrEmpty(textToAnalyze))
            {
                throw new ArgumentException("At least one of 'title' or 'content' must be provided to generate tags.");
            }

            var tags = ExtractKeywords(textToAnalyze);

            return new
            {
                tags = tags
            };
        }

        private List<string> ExtractKeywords(string text)
        {
            // Simple keyword extraction logic
            var words = text.Split(new[] { ' ', '.', ',', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
            var commonWords = new HashSet<string> { "the", "and", "a", "to", "is", "in", "it", "you", "of", "this", "that" };
            var significantWords = words.Where(w => w.Length > 3 && !commonWords.Contains(w.ToLower()));
            return significantWords.Distinct(StringComparer.OrdinalIgnoreCase).Take(5).ToList();
        }

        private List<string> GetRelevantResources(string topic)
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
    }
}
