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
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Services
{
    public class OpenAIService : IOpenAIService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<OpenAIService> _logger;
        public required string ApiEndpoint { get; init; }
        private const string JsonMediaType = "application/json";

        public OpenAIService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OpenAIService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            var apiKey = configuration["OpenAI:ApiKey"];
            ApiEndpoint = configuration["OpenAI:ApiEndpoint"] ?? 
                throw new ArgumentException("OpenAI:ApiEndpoint configuration is required");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(JsonMediaType));
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
                    "gpt-4.1" => 32000,
                    "gpt-4.1-mini" => 32000,
                    "gpt-4.1-nano" => 32000,
                    "o4-mini" => 100000,
                    "o3-mini" => 100000,
                    "o1" => 100000,
                    "o1-pro" => 100000,
                    _ => 2048 // default fallback
                };

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                bool useMaxCompletionTokens = request.Model.StartsWith("o");

                // Determine if the model requires max_completion_tokens and has temperature restrictions
                bool isRestrictedModel = request.Model.StartsWith("o");

                object apiRequestPayload;
                double effectiveTemperature = isRestrictedModel ? 1.0 : (request.Temperature ?? 0.7);

                if (useMaxCompletionTokens)
                {
                    apiRequestPayload = new
                    {
                        model = request.Model,
                        messages = request.Messages,
                        max_completion_tokens = maxOutputTokens,
                        temperature = effectiveTemperature,
                        top_p = request.TopP ?? 1.0,
                        frequency_penalty = request.FrequencyPenalty ?? 0.0,
                        presence_penalty = request.PresencePenalty ?? 0.0
                    };
                }
                else
                {
                    apiRequestPayload = new
                    {
                        model = request.Model,
                        messages = request.Messages,
                        max_tokens = maxOutputTokens,
                        temperature = effectiveTemperature,
                        top_p = request.TopP ?? 1.0,
                        frequency_penalty = request.FrequencyPenalty ?? 0.0,
                        presence_penalty = request.PresencePenalty ?? 0.0
                    };
                }

                var json = JsonSerializer.Serialize(apiRequestPayload, jsonOptions);
                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                _logger.LogInformation("Sending message to OpenAI. Model: {ModelId}, MaxOutputTokens: {MaxOutputTokens}, UsingMaxCompletionTokens: {UseMaxCompletionTokens}", 
                    request.Model, maxOutputTokens, useMaxCompletionTokens);
                _logger.LogDebug("Request Payload: {RequestPayload}", json);

                var response = await _httpClient.PostAsync($"{ApiEndpoint}/chat/completions", content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("Response Content: {ResponseContent}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    var messageResponse = JsonSerializer.Deserialize<SendMessageResponse>(responseString, jsonOptions)
                        ?? throw new OpenAIException("Failed to deserialize OpenAI response");
                    return messageResponse;
                }

                var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString, jsonOptions);
                throw new OpenAIException($"OpenAI API Error: {errorResponse?.Error?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to OpenAI");
                throw new OpenAIException("Failed to send message to OpenAI", ex);
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

                var response = await _httpClient.PostAsync($"{ApiEndpoint}/audio/transcriptions", formData);
                var responseString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully transcribed audio");
                    var transcription = JsonSerializer.Deserialize<AudioTranscriptionResponse>(responseString, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? throw new OpenAIException("Failed to deserialize audio transcription response");
                    return transcription;
                }

                var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                _logger.LogError("OpenAI API Error: {ErrorMessage}", errorResponse?.Error?.Message);
                throw new OpenAIException($"OpenAI API Error: {errorResponse?.Error?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transcribing audio");
                throw new OpenAIException("Failed to transcribe audio", ex);
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
                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                var response = await _httpClient.PostAsync($"{ApiEndpoint}/audio/speech", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new OpenAIException($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                var audioStream = await response.Content.ReadAsStreamAsync();
                return new TextToSpeechResponse
                {
                    AudioStream = audioStream,
                    Model = request.Model,
                    Usage = new Usage { PromptTokens = 0, CompletionTokens = 0, TotalTokens = 0 }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting text to speech");
                throw new OpenAIException("Failed to convert text to speech", ex);
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
                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                var response = await _httpClient.PostAsync($"{ApiEndpoint}/embeddings", content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new OpenAIException($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                var embeddingsResponse = JsonSerializer.Deserialize<EmbeddingsResponse>(responseString, jsonOptions)
                    ?? throw new OpenAIException("Failed to deserialize embeddings response");
                return embeddingsResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating embeddings");
                throw new OpenAIException("Failed to create embeddings", ex);
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

                var content = new StringContent(json, Encoding.UTF8, JsonMediaType);

                var response = await _httpClient.PostAsync($"{ApiEndpoint}/images/generations", content);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received response from OpenAI: {Response}", responseString);

                if (!response.IsSuccessStatusCode)
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    throw new OpenAIException($"OpenAI API Error: {errorResponse?.Error?.Message}");
                }

                var result = JsonSerializer.Deserialize<ImageGenerationResponse>(responseString, jsonOptions);
                
                if (result?.Data == null || !result.Data.Any())
                {
                    throw new OpenAIException("No image was generated in the response");
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image");
                throw new OpenAIException("Failed to generate image", ex);
            }
        }

        public Stream GetAudioStream(TextToSpeechResponse response)
        {
            try
            {
                if (response.AudioStream == null)
                {
                    throw new OpenAIException("No audio stream available");
                }
                
                return response.AudioStream;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audio stream");
                throw new OpenAIException("Failed to get audio stream", ex);
            }
        }

        public async Task<OpenAIModelsResponse> GetModelsAsync()
        {
            var modelsRequestUri = $"{ApiEndpoint}/models";
            _logger.LogInformation("Fetching models from OpenAI API at {ModelsRequestUri}", modelsRequestUri);

            var request = new HttpRequestMessage(HttpMethod.Get, modelsRequestUri);
            // Authorization header is already set in the HttpClient's DefaultRequestHeaders by the constructor

            try
            {
                var response = await _httpClient.SendAsync(request);
                var responseString = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Received model list response from OpenAI API.");
                _logger.LogDebug("OpenAI Models Response Content: {ResponseContent}", responseString);

                if (response.IsSuccessStatusCode)
                {
                    var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var modelsResponse = JsonSerializer.Deserialize<OpenAIModelsResponse>(responseString, jsonOptions);
                    if (modelsResponse == null)
                    {
                        _logger.LogError("Failed to deserialize OpenAI models response. Response string was: {ResponseContent}", responseString);
                        throw new OpenAIException("Failed to deserialize models response from OpenAI API.");
                    }
                    return modelsResponse;
                }
                else
                {
                    var errorResponse = JsonSerializer.Deserialize<OpenAIErrorResponse>(responseString);
                    var errorMessage = errorResponse?.Error?.Message ?? "Unknown error";
                    _logger.LogError("OpenAI API Error while fetching models: {StatusCode} - {ErrorMessage}", response.StatusCode, errorMessage);
                    throw new OpenAIException($"OpenAI API Error fetching models: {response.StatusCode} - {errorMessage}");
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP Request Exception while fetching models from OpenAI API.");
                throw new OpenAIException($"Failed to communicate with OpenAI API to fetch models: {ex.Message}", ex);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON Deserialization Exception while fetching models from OpenAI API.");
                throw new OpenAIException($"Failed to parse models response from OpenAI API: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Exception while fetching models from OpenAI API.");
                throw new OpenAIException($"Unexpected error while fetching OpenAI models: {ex.Message}", ex);
            }
        }
    }
}