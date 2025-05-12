using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OllamaSharp;
using System.Text;
using SecondBrain.Api.Exceptions;
using SecondBrain.Api.DTOs.Ollama;
using System.Net.Http;
using System.Text.Json;

namespace SecondBrain.Api.Services
{
    public class OllamaService : IOllamaService
    {
        private readonly ILogger<OllamaService> _logger;
        private readonly OllamaApiClient _ollamaClient;
        private readonly Uri _ollamaUri;
        private readonly HttpClient _httpClient;

        public OllamaService(IConfiguration configuration, ILogger<OllamaService> logger)
        {
            _logger = logger;
            _ollamaUri = new Uri(configuration.GetValue<string>("Ollama:OllamaUri") ?? throw new InvalidOperationException("Ollama:OllamaUri configuration is required"));
            _ollamaClient = new OllamaApiClient(_ollamaUri);
            _httpClient = new HttpClient();
        }

        public async Task<string> GenerateTextAsync(string prompt, string modelName, int numPredict = 2048)
        {
            try
            {
                var responseBuilder = new StringBuilder();
                
                // Set the model name on the client
                _ollamaClient.SelectedModel = modelName;
                
                // Call GenerateAsync with just the prompt parameter
                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    if (stream?.Response != null)
                    {
                        responseBuilder.Append(stream.Response);
                    }
                }
                return responseBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Ollama API: {Message}", ex.Message);
                throw new OllamaException("Failed to get response from Ollama", ex);
            }
        }

        public async Task StreamGenerateTextAsync(string prompt, string modelName, Func<string, Task> callback, int numPredict = 2048)
        {
            try
            {
                _logger.LogInformation("Starting streaming request to Ollama with model {ModelName}", modelName);
                
                // Set the model name on the client
                _ollamaClient.SelectedModel = modelName;
                
                // Call GenerateAsync with just the prompt parameter
                await foreach (var stream in _ollamaClient.GenerateAsync(prompt))
                {
                    // Check if the response stream contains a new token
                    if (stream?.Response != null)
                    {
                        // Call the callback with the new token
                        await callback(stream.Response);
                    }
                }
                
                _logger.LogInformation("Completed streaming request to Ollama with model {ModelName}", modelName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error streaming from Ollama API: {Message}", ex.Message);
                throw new OllamaException("Failed to stream response from Ollama", ex);
            }
        }

        public async Task<OllamaModelsResponse> GetAvailableModelsAsync()
        {
            try
            {
                _logger.LogInformation("Fetching available models from Ollama at {OllamaUri}", _ollamaUri);
                
                var modelsEndpoint = new Uri(_ollamaUri, "api/tags");
                var response = await _httpClient.GetAsync(modelsEndpoint);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorMessage = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Error fetching models from Ollama: {StatusCode} - {ErrorMessage}", 
                        response.StatusCode, errorMessage);
                    throw new OllamaException($"Failed to fetch models from Ollama: {response.StatusCode}");
                }
                
                var content = await response.Content.ReadAsStringAsync();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var models = JsonSerializer.Deserialize<OllamaModelsResponse>(content, options);
                
                _logger.LogInformation("Successfully fetched {Count} models from Ollama", models?.Models.Count ?? 0);
                
                return models ?? new OllamaModelsResponse();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching models from Ollama API: {Message}", ex.Message);
                throw new OllamaException("Failed to fetch models from Ollama", ex);
            }
        }
    }
}