using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using SecondBrain.Api.DTOs.Perplexity;
using SecondBrain.Api.Exceptions;
using SecondBrain.Api.Constants;
using System.Collections.Generic;

namespace SecondBrain.Api.Services
{
    public class PerplexityService : IPerplexityService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PerplexityService> _logger;
        private readonly string _baseUrl;
        private const string JsonMediaType = "application/json";

        public PerplexityService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<PerplexityService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;

            var apiKey = configuration["Perplexity:ApiKey"] ??
                throw new ArgumentException("Perplexity:ApiKey configuration is required");
            
            _baseUrl = configuration["Perplexity:BaseUrl"] ??
                throw new ArgumentException("Perplexity:BaseUrl configuration is required");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(JsonMediaType));
        }

        public async Task<PerplexityResponse> SendMessageAsync(PerplexityRequest request)
        {
            try
            {
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var json = JsonSerializer.Serialize(request, jsonOptions);
                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                _logger.LogInformation("Sending message to Perplexity. Model: {ModelId}", request.Model);
                _logger.LogDebug("Request Payload: {RequestPayload}", json);

                var response = await _httpClient.PostAsync($"{_baseUrl}chat/completions", content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("Response Content: {ResponseContent}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    var messageResponse = JsonSerializer.Deserialize<PerplexityResponse>(responseString, jsonOptions)
                        ?? throw new Exception("Failed to deserialize Perplexity response");
                    return messageResponse;
                }

                var errorResponse = JsonSerializer.Deserialize<PerplexityErrorResponse>(responseString, jsonOptions);
                throw new Exception($"Perplexity API Error: {errorResponse?.Error?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to Perplexity");
                throw new Exception("Failed to send message to Perplexity", ex);
            }
        }

        public async Task<SearchResponse> SearchAsync(SearchRequest request)
        {
            try
            {
                // Create a chat message format with the search query
                var perplexityRequest = new PerplexityRequest
                {
                    Model = request.Model ?? PerplexityModels.Default,
                    Temperature = request.Temperature,
                    Messages = new System.Collections.Generic.List<PerplexityMessage>
                    {
                        new PerplexityMessage
                        {
                            Role = "system",
                            Content = "You are a helpful search assistant. Provide comprehensive, accurate and detailed answers to the user's search query. Include relevant information, facts, and data to support your response."
                        },
                        new PerplexityMessage
                        {
                            Role = "user",
                            Content = request.Query
                        }
                    }
                };

                var perplexityResponse = await SendMessageAsync(perplexityRequest);

                // Extract the result from the Perplexity response
                var result = perplexityResponse.Choices.Count > 0
                    ? perplexityResponse.Choices[0].Message.Content
                    : "No results found.";

                return new SearchResponse
                {
                    Result = result,
                    Usage = perplexityResponse.Usage,
                    Model = perplexityResponse.Model
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error performing search with Perplexity");
                throw new Exception("Failed to perform search with Perplexity", ex);
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                var testRequest = new PerplexityRequest
                {
                    Model = PerplexityModels.Sonar,
                    Messages = new System.Collections.Generic.List<PerplexityMessage>
                    {
                        new PerplexityMessage { Role = "user", Content = "Hello" }
                    },
                    MaxTokens = 5
                };

                var response = await SendMessageAsync(testRequest);
                return response?.Choices?.Count > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test Perplexity connection");
                return false;
            }
        }

        public Task<AvailableModelsResponse> GetAvailableModelsAsync()
        {
            // Perplexity doesn't have a models endpoint currently, so we'll return a static list
            var models = new List<PerplexityModelInfo>
            {
                // Search Models
                new PerplexityModelInfo
                {
                    Id = PerplexityModels.Sonar,
                    Name = "Sonar",
                    Description = "Lightweight, cost-effective search model with grounding.",
                    Category = "search"
                },
                new PerplexityModelInfo
                {
                    Id = PerplexityModels.SonarPro,
                    Name = "Sonar Pro",
                    Description = "Advanced search offering with grounding, supporting complex queries and follow-ups.",
                    Category = "search"
                },
                
                // Research Models
                new PerplexityModelInfo
                {
                    Id = PerplexityModels.SonarDeepResearch,
                    Name = "Sonar Deep Research",
                    Description = "Expert-level research model conducting exhaustive searches and generating comprehensive reports.",
                    Category = "research"
                },
                
                // Reasoning Models
                new PerplexityModelInfo
                {
                    Id = PerplexityModels.SonarReasoning,
                    Name = "Sonar Reasoning",
                    Description = "Fast, real-time reasoning model designed for quick problem-solving with search.",
                    Category = "reasoning"
                },
                new PerplexityModelInfo
                {
                    Id = PerplexityModels.SonarReasoningPro,
                    Name = "Sonar Reasoning Pro",
                    Description = "Premier reasoning offering powered by DeepSeek R1 with Chain of Thought (CoT).",
                    Category = "reasoning"
                }
            };

            return Task.FromResult(new AvailableModelsResponse { Models = models });
        }
    }
} 