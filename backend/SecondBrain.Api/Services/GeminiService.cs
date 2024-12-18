using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Models;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Api.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiService> _logger;
        private readonly string? _apiKey;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Gemini:ApiKey"];
            _logger.LogInformation("Initializing Gemini service");
            _httpClient.BaseAddress = new Uri(configuration["Gemini:BaseUrl"] ??
                throw new ArgumentException("Gemini API base URL not configured"));
        }

        public async Task<GeminiUpdate> ChatAsync(string prompt, string modelId = "gemini-1.5-pro")
        {
            try
            {
                modelId = modelId.Replace("models/", "");
                
                var request = new GeminiRequest
                {
                    Contents = new[]
                    {
                        new GeminiContent
                        {
                            Parts = new[]
                            {
                                new ContentPart { Text = prompt }
                            }
                        }
                    },
                    SafetySettings = new SafetySetting[] { },
                    GenerationConfig = new GenerationConfig
                    {
                        Temperature = 0.7f,
                        MaxOutputTokens = 2048,
                        TopP = 0.8f,
                        TopK = 40,
                        StopSequences = new string[] { }
                    }
                };

                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:generateContent?key={_apiKey}",
                    request
                );

                if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                {
                    _logger.LogWarning("Gemini service is temporarily unavailable");
                    return new GeminiUpdate(
                        "gemini",
                        "I apologize, but I'm temporarily unavailable due to high demand. Please try again in a few moments.",
                        new Dictionary<string, object>
                        {
                            { "error", "Service temporarily unavailable" }
                        }
                    );
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error: {StatusCode} - {Error}",
                        response.StatusCode, errorContent);

                    throw new HttpRequestException($"Gemini API error: {response.StatusCode} - {errorContent}");
                }

                var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
                var content = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text
                    ?? throw new InvalidOperationException("No content received from Gemini API");

                return new GeminiUpdate(
                    "gemini",
                    content,
                    new Dictionary<string, object> { { "model", modelId } }
                );
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is JsonException)
            {
                _logger.LogError(ex, "Failed to get response from Gemini");
                throw new HttpRequestException("Failed to get Gemini chat response", ex);
            }
        }

        public async Task<GeminiResponse> GenerateContentAsync(GeminiRequest request)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/gemini-1.5-flash:generateContent?key={_apiKey}",
                    request
                );

                if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                {
                    throw new HttpRequestException("Gemini service is temporarily unavailable. Please try again later.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error: {StatusCode} - {Error}",
                        response.StatusCode, errorContent);

                    throw new HttpRequestException($"Gemini API error: {response.StatusCode} - {errorContent}");
                }

                return await response.Content.ReadFromJsonAsync<GeminiResponse>()
                    ?? throw new InvalidOperationException("Failed to deserialize Gemini response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate content from Gemini");
                throw new HttpRequestException("Failed to generate content from Gemini", ex);
            }
        }

        public bool IsConfigured()
        {
            var isConfigured = !string.IsNullOrEmpty(_apiKey);
            _logger.LogDebug("Gemini service configuration status: {IsConfigured}", isConfigured);
            return isConfigured;
        }
    }

    public class GeminiResponse
    {
        public Candidate[]? Candidates { get; set; }
    }

    public class Candidate
    {
        public Content? Content { get; set; }
    }

    public class Content
    {
        public Part[]? Parts { get; set; }
    }

    public class Part
    {
        public string? Text { get; set; }
    }
}
