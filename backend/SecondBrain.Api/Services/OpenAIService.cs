using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using SecondBrain.Api.DTOs.OpenAI;
using System.Net.Http.Headers;
using System.Diagnostics;

namespace SecondBrain.Api.Services
{
    public class OpenAIService : IOpenAIService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OpenAIService> _logger;
        private readonly string _apiKey;
        private readonly string _apiEndpoint;

        public OpenAIService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OpenAIService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _apiKey = _configuration["OpenAI:ApiKey"];
            _apiEndpoint = _configuration["OpenAI:ApiEndpoint"];

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<SendMessageResponse> SendMessageAsync(SendMessageRequest request)
        {
            try
            {
                var maxOutputTokens = request.Model switch
                {
                    "gpt-4-turbo-preview" => 4096,
                    "gpt-4" => 8192,
                    "gpt-3.5-turbo" => 4096,
                    "gpt-4o" => 16384,
                    "gpt-4o-mini" => 16384,
                    _ => 2048 // default fallback
                };

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var apiRequest = new
                {
                    model = request.Model,
                    messages = request.Messages,
                    max_tokens = maxOutputTokens,
                    temperature = request.Temperature ?? 0.7,
                    top_p = request.TopP ?? 1.0,
                    frequency_penalty = request.FrequencyPenalty ?? 0.0,
                    presence_penalty = request.PresencePenalty ?? 0.0
                };

                var json = JsonSerializer.Serialize(apiRequest, jsonOptions);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending message to OpenAI. Model: {ModelId}, MaxTokens: {MaxTokens}", 
                    request.Model, maxOutputTokens);
                _logger.LogDebug("Request Payload: {RequestPayload}", json);

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/chat/completions", content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("Response Content: {ResponseContent}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    return JsonSerializer.Deserialize<SendMessageResponse>(responseString, jsonOptions);
                }

                var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString, jsonOptions);
                throw new Exception($"OpenAI API Error: {errorResponse?.Error?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to OpenAI");
                throw;
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                var testRequest = new SendMessageRequest
                {
                    Model = "gpt-3.5-turbo",
                    Messages = new List<Message>
                    {
                        new Message { Role = "user", Content = "Hello" }
                    },
                    MaxTokens = 5
                };

                var response = await SendMessageAsync(testRequest);
                return response?.Choices?.Any() == true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to test OpenAI connection");
                return false;
            }
        }

        public async Task<AudioTranscriptionResponse> TranscribeAudioAsync(IFormFile file)
        {
            try
            {
                using var formData = new MultipartFormDataContent();
                using var fileStream = file.OpenReadStream();
                using var streamContent = new StreamContent(fileStream);

                formData.Add(streamContent, "file", file.FileName);
                formData.Add(new StringContent("whisper-1"), "model");
                formData.Add(new StringContent("json"), "response_format");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/audio/transcriptions", formData);
                var responseString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully transcribed audio");
                    return JsonSerializer.Deserialize<AudioTranscriptionResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                }

                var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                _logger.LogError("OpenAI API Error: {ErrorMessage}", errorResponse?.Error?.Message);
                throw new Exception($"OpenAI API Error: {errorResponse?.Error?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transcribing audio");
                throw;
            }
        }

        public async Task<TextToSpeechResponse> TextToSpeechAsync(TextToSpeechRequest request)
        {
            try
            {
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var apiRequest = new
                {
                    input = request.Input,
                    model = request.Model,
                    voice = request.Voice
                };

                var json = JsonSerializer.Serialize(apiRequest, jsonOptions);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/audio/speech", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new Exception($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                var audioStream = await response.Content.ReadAsStreamAsync();
                return new TextToSpeechResponse
                {
                    AudioStream = audioStream
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting text to speech");
                throw;
            }
        }

        public async Task<EmbeddingsResponse> CreateEmbeddingsAsync(EmbeddingsRequest request)
        {
            try
            {
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var json = JsonSerializer.Serialize(request, jsonOptions);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/embeddings", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new Exception($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                return JsonSerializer.Deserialize<EmbeddingsResponse>(responseString, jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating embeddings");
                throw;
            }
        }

        public async Task<ImageGenerationResponse> GenerateImageAsync(ImageGenerationRequest request)
        {
            try
            {
                _logger.LogInformation("Starting image generation with prompt: {Prompt}", request.Prompt);

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var json = JsonSerializer.Serialize(new
                {
                    model = request.Model,
                    prompt = request.Prompt,
                    n = request.N,
                    size = request.Size,
                    quality = request.Quality,
                    style = request.Style
                }, jsonOptions);

                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{_apiEndpoint}/images/generations", content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received response from OpenAI: {Response}", responseString);

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new Exception($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                var result = JsonSerializer.Deserialize<ImageGenerationResponse>(responseString, jsonOptions);
                
                if (result?.Data == null || !result.Data.Any())
                {
                    throw new Exception("No image was generated in the response");
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image");
                throw;
            }
        }

        public async Task<Stream> GetAudioStreamAsync(TextToSpeechResponse response)
        {
            try
            {
                if (response.AudioStream == null)
                {
                    throw new Exception("No audio stream available");
                }
                
                return response.AudioStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audio stream");
                throw;
            }
        }
    }
}