using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json.Serialization;
using System.IO;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;

namespace SecondBrain.Api.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiService> _logger;
        private readonly string? _apiKey;
        private readonly string _baseUrl;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Gemini:ApiKey"];
            _baseUrl = configuration["Gemini:BaseUrl"] ??
                throw new ArgumentException("Gemini API base URL not configured");
            _logger.LogInformation("Initializing Gemini service");
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }

        public async Task<GeminiUpdate> ChatAsync(string prompt, string modelId = "gemini-1.5-pro", GenerationConfig? generationConfig = null, SafetySetting[]? safetySettings = null)
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
                    SafetySettings = safetySettings ?? new SafetySetting[] { },
                    GenerationConfig = generationConfig ?? new GenerationConfig
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
                
                if (result?.Candidates == null || result.Candidates.Length == 0)
                {
                    _logger.LogWarning("No candidates in Gemini API response");
                    return new GeminiUpdate(
                        "gemini",
                        "I apologize, but I couldn't generate a response at this time.",
                        new Dictionary<string, object> { { "error", "No candidates in response" } }
                    );
                }
                
                var candidatePart = result.Candidates[0].Content?.Parts?.FirstOrDefault();
                var content = candidatePart?.Text;
                
                if (string.IsNullOrEmpty(content))
                {
                    _logger.LogWarning("No text content in Gemini API response");
                    return new GeminiUpdate(
                        "gemini",
                        "I apologize, but I couldn't generate a text response at this time.",
                        new Dictionary<string, object> { { "error", "No text content in response" } }
                    );
                }

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

        public async Task<GeminiResponse> GenerateContentAsync(GeminiRequest request, string modelId = "gemini-1.5-pro")
        {
            try
            {
                modelId = modelId.Replace("models/", "");
                
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:generateContent?key={_apiKey}",
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
        
        public async IAsyncEnumerable<GeminiUpdate> StreamGenerateContentAsync(GeminiRequest request, string modelId = "gemini-1.5-pro")
        {
            modelId = modelId.Replace("models/", "");
            
            // Create HTTP request message with SSE query parameter
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"models/{modelId}:streamGenerateContent?key={_apiKey}&alt=sse");
            requestMessage.Content = new StringContent(
                JsonSerializer.Serialize(request),
                Encoding.UTF8,
                "application/json"
            );
            
            HttpResponseMessage? response = null;
            Stream? stream = null;
            StreamReader? reader = null;
            
            // Handle the request outside of any yield context
            bool hasError = false;
            string? errorMessage = null;
            
            try
            {
                response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini streaming error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    hasError = true;
                    errorMessage = $"Gemini API error: {response.StatusCode} - {errorContent}";
                }
                else
                {
                    stream = await response.Content.ReadAsStreamAsync();
                    reader = new StreamReader(stream);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Error setting up streaming: {Error}", ex.Message);
                hasError = true;
                errorMessage = $"I encountered an error while setting up streaming: {ex.Message}";
            }
            
            // If there was an error during setup, yield error and exit
            if (hasError)
            {
                yield return new GeminiUpdate(
                    "error",
                    errorMessage ?? "Unknown error occurred",
                    new Dictionary<string, object> 
                    { 
                        { "error", errorMessage ?? "Unknown error" },
                        { "model", modelId }
                    }
                );
                
                // Clean up and exit
                reader?.Dispose();
                stream?.Dispose();
                response?.Dispose();
                yield break;
            }
            
            // Now we can safely stream without try-catch around yields
            if (reader != null)
            {
                await foreach (var update in ReadStreamSafely(reader, modelId))
                {
                    yield return update;
                }
            }
            
            // Clean up
            reader?.Dispose();
            stream?.Dispose();
            response?.Dispose();
        }
        
        private async IAsyncEnumerable<GeminiUpdate> ReadStreamSafely(StreamReader reader, string modelId)
        {
            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                if (line.StartsWith("data: "))
                {
                    var data = line.Substring(6);
                    
                    // Check if it's the closing event
                    if (data == "{}" || line.Contains("\"[DONE]\""))
                    {
                        break;
                    }
                    
                    // Parse the data safely
                    var update = ParseStreamData(data, modelId);
                    if (update != null)
                    {
                        yield return update;
                    }
                }
                else if (line.StartsWith("event: ") && line.Contains("done"))
                {
                    break;
                }
            }
        }
        
        private GeminiUpdate? ParseStreamData(string data, string modelId)
        {
            try
            {
                var streamResponse = JsonSerializer.Deserialize<GeminiResponse>(data);
                var textContent = streamResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                
                if (!string.IsNullOrEmpty(textContent))
                {
                    return new GeminiUpdate("gemini", textContent, new Dictionary<string, object> 
                    { 
                        { "model", modelId },
                        { "isStreaming", true },
                        { "finishReason", streamResponse?.Candidates?.FirstOrDefault()?.FinishReason ?? "null" }
                    });
                }
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError("Failed to parse SSE data: {Data} - {Error}", data, jsonEx.Message);
            }
            
            return null;
        }
        


        
        public async Task<List<ModelInfo>> ListModelsAsync(int? pageSize = null, string? pageToken = null)
        {
            try
            {
                var url = $"models?key={_apiKey}";
                
                if (pageSize.HasValue)
                {
                    url += $"&pageSize={pageSize}";
                }
                
                if (!string.IsNullOrEmpty(pageToken))
                {
                    url += $"&pageToken={pageToken}";
                }
                
                var response = await _httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to list Gemini models: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to list models: {response.StatusCode} - {errorContent}");
                }
                
                var listResponse = await response.Content.ReadFromJsonAsync<ListModelsResponse>();
                return listResponse?.Models ?? new List<ModelInfo>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing Gemini models");
                throw;
            }
        }
        
        public async Task<ModelInfo> GetModelDetailsAsync(string modelId)
        {
            modelId = modelId.Replace("models/", "");
            
            try
            {
                var response = await _httpClient.GetAsync($"models/{modelId}?key={_apiKey}");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to get model details: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to get model details: {response.StatusCode} - {errorContent}");
                }
                
                var model = await response.Content.ReadFromJsonAsync<ModelInfo>();
                return model ?? throw new InvalidOperationException("Failed to deserialize model details");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting model details for {ModelId}", modelId);
                throw;
            }
        }
        
        public async Task<TokenCountResponse> CountTokensAsync(GeminiRequest request, string modelId = "gemini-1.5-pro")
        {
            modelId = modelId.Replace("models/", "");
            
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:countTokens?key={_apiKey}",
                    request
                );
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to count tokens: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to count tokens: {response.StatusCode} - {errorContent}");
                }
                
                var tokenResponse = await response.Content.ReadFromJsonAsync<TokenCountResponse>();
                return tokenResponse ?? throw new InvalidOperationException("Failed to deserialize token count response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error counting tokens for model {ModelId}", modelId);
                throw;
            }
        }
        
        public async Task<EmbeddingResponse> GenerateEmbeddingAsync(EmbeddingRequest request, string modelId = "gemini-embedding-exp")
        {
            modelId = modelId.Replace("models/", "");
            
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:embedContent?key={_apiKey}",
                    request
                );
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to generate embedding: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to generate embedding: {response.StatusCode} - {errorContent}");
                }
                
                var embeddingResponse = await response.Content.ReadFromJsonAsync<EmbeddingResponse>();
                return embeddingResponse ?? throw new InvalidOperationException("Failed to deserialize embedding response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating embedding for model {ModelId}", modelId);
                throw;
            }
        }
        
        public async Task<BatchEmbeddingResponse> GenerateBatchEmbeddingsAsync(BatchEmbeddingRequest request, string modelId = "gemini-embedding-exp")
        {
            modelId = modelId.Replace("models/", "");
            
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:batchEmbedContents?key={_apiKey}",
                    request
                );
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to generate batch embeddings: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to generate batch embeddings: {response.StatusCode} - {errorContent}");
                }
                
                var batchResponse = await response.Content.ReadFromJsonAsync<BatchEmbeddingResponse>();
                return batchResponse ?? throw new InvalidOperationException("Failed to deserialize batch embedding response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating batch embeddings for model {ModelId}", modelId);
                throw;
            }
        }
        
        public async Task<FileUploadResponse> UploadFileAsync(Stream fileStream, string fileName, string mimeType)
        {
            try
            {
                // Step 1: Initiate the upload
                var initiateRequest = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/upload/v1beta/files?key={_apiKey}");
                
                // Add required headers for resumable upload
                initiateRequest.Headers.Add("X-Goog-Upload-Protocol", "resumable");
                initiateRequest.Headers.Add("X-Goog-Upload-Command", "start");
                initiateRequest.Headers.Add("X-Goog-Upload-Header-Content-Type", mimeType);
                
                // Get file size
                var fileSize = fileStream.Length;
                initiateRequest.Headers.Add("X-Goog-Upload-Header-Content-Length", fileSize.ToString());
                
                // Create metadata payload
                var metadata = new FileUploadInitiateRequest
                {
                    File = new FileMetadata
                    {
                        DisplayName = fileName
                    }
                };
                
                initiateRequest.Content = new StringContent(
                    JsonSerializer.Serialize(metadata),
                    Encoding.UTF8,
                    "application/json"
                );
                
                // Send initiate request
                var initiateResponse = await _httpClient.SendAsync(initiateRequest);
                
                if (!initiateResponse.IsSuccessStatusCode)
                {
                    var errorContent = await initiateResponse.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to initiate file upload: {StatusCode} - {Error}", 
                        initiateResponse.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to initiate file upload: {initiateResponse.StatusCode} - {errorContent}");
                }
                
                // Get upload URL from response headers
                if (!initiateResponse.Headers.TryGetValues("X-Goog-Upload-URL", out var uploadUrls) && 
                    !initiateResponse.Headers.TryGetValues("Location", out uploadUrls))
                {
                    throw new InvalidOperationException("Failed to get upload URL from response headers");
                }
                
                var uploadUrl = uploadUrls.First();
                
                // Step 2: Upload the file content
                var uploadRequest = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
                uploadRequest.Headers.Add("X-Goog-Upload-Command", "upload, finalize");
                uploadRequest.Headers.Add("Content-Length", fileSize.ToString());
                
                // Reset stream position
                fileStream.Position = 0;
                
                // Create StreamContent for file data
                uploadRequest.Content = new StreamContent(fileStream);
                uploadRequest.Content.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
                
                // Send upload request
                var uploadResponse = await _httpClient.SendAsync(uploadRequest);
                
                if (!uploadResponse.IsSuccessStatusCode)
                {
                    var errorContent = await uploadResponse.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to upload file content: {StatusCode} - {Error}", 
                        uploadResponse.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to upload file content: {uploadResponse.StatusCode} - {errorContent}");
                }
                
                // Parse the upload response
                var fileResponse = await uploadResponse.Content.ReadFromJsonAsync<FileUploadResponse>();
                return fileResponse ?? throw new InvalidOperationException("Failed to deserialize file upload response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file {FileName}", fileName);
                throw;
            }
        }
        
        public async Task<bool> DeleteFileAsync(string fileId)
        {
            try
            {
                var response = await _httpClient.DeleteAsync($"files/{fileId}?key={_apiKey}");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to delete file: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    
                    // If file not found, consider it "deleted"
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        return true;
                    }
                    
                    throw new HttpRequestException($"Failed to delete file: {response.StatusCode} - {errorContent}");
                }
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file {FileId}", fileId);
                throw;
            }
        }
        
        public async Task<ImageGenerationResponse> GenerateImageAsync(ImageGenerationRequest request, string modelId = "imagen-3.0-generate-002")
        {
            modelId = modelId.Replace("models/", "");
            
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"models/{modelId}:generateImage?key={_apiKey}",
                    request
                );
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to generate image: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new HttpRequestException($"Failed to generate image: {response.StatusCode} - {errorContent}");
                }
                
                var imageResponse = await response.Content.ReadFromJsonAsync<ImageGenerationResponse>();
                return imageResponse ?? throw new InvalidOperationException("Failed to deserialize image generation response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image with model {ModelId}", modelId);
                throw;
            }
        }

        public bool IsConfigured()
        {
            var isConfigured = !string.IsNullOrEmpty(_apiKey);
            _logger.LogDebug("Gemini service configuration status: {IsConfigured}", isConfigured);
            return isConfigured;
        }
    }
}
