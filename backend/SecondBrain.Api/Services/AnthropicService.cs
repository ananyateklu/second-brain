using System.Net.Http;
using System.Text;
using System.Text.Json;
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

            var json = JsonSerializer.Serialize(requestPayload);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");

            // Set the required headers
            _httpClient.DefaultRequestHeaders.Clear(); // Clear existing headers to avoid duplication
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
            _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            try
            {
                _logger.LogInformation("Sending message to Claude. Model: {ModelId}", requestPayload.Model);
                var response = await _httpClient.PostAsync(_requestUri, httpContent);
                var responseString = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Received response from Claude: {Response}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    var sendMessageResponse = JsonSerializer.Deserialize<SendMessageResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

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
    }
}
