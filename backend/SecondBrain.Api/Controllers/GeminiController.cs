using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Services;
using System;
using System.Threading.Tasks;
using System.IO;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System.Text;

namespace SecondBrain.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/gemini")]
    public class GeminiController : ControllerBase
    {
        private readonly IGeminiService _geminiService;
        private readonly ILogger<GeminiController> _logger;

        public GeminiController(IGeminiService geminiService, ILogger<GeminiController> logger)
        {
            _geminiService = geminiService;
            _logger = logger;
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                _logger.LogInformation("Received chat request for model: {ModelId}", request.ModelId);
                var response = await _geminiService.ChatAsync(request.Message, request.ModelId);
                return Ok(new { content = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Gemini chat request");
                return StatusCode(500, new { error = "Failed to process chat request", details = ex.Message });
            }
        }
        
        [HttpPost("stream-chat")]
        public async Task<IActionResult> StreamChat([FromBody] StreamChatRequest request)
        {
            // Set up response for Server-Sent Events
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            
            try
            {
                var modelId = request.ModelId ?? "gemini-1.5-pro";
                _logger.LogInformation("Received streaming chat request for model: {ModelId}", modelId);
                
                // Create request for streaming
                var geminiRequest = new GeminiRequest
                {
                    Contents = new[]
                    {
                        new GeminiContent
                        {
                            Parts = new[]
                            {
                                new ContentPart { Text = request.Message }
                            }
                        }
                    },
                    SafetySettings = request.SafetySettings ?? Array.Empty<SafetySetting>(),
                    GenerationConfig = request.GenerationConfig ?? new GenerationConfig
                    {
                        Temperature = 0.7f,
                        MaxOutputTokens = 2048,
                        TopP = 0.8f,
                        TopK = 40,
                        StopSequences = Array.Empty<string>()
                    }
                };
                
                // Stream the response
                await foreach (var update in _geminiService.StreamGenerateContentAsync(geminiRequest, modelId))
                {
                    var data = $"data: {System.Text.Json.JsonSerializer.Serialize(update)}\n\n";
                    await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(data));
                    await Response.Body.FlushAsync();
                }
                
                // Signal the end of the stream
                await Response.Body.WriteAsync(Encoding.UTF8.GetBytes("data: [DONE]\n\n"));
                await Response.Body.FlushAsync();
                
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Gemini streaming chat request");
                // For already started streams, we need to return the error in SSE format
                var errorData = $"data: {{\"error\": \"{ex.Message}\"}}\n\n";
                await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(errorData));
                await Response.Body.FlushAsync();
                return new EmptyResult();
            }
        }

        [HttpGet("test-connection")]
        [AllowAnonymous] // Or use [Authorize] if authentication is required for this check
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                _logger.LogInformation("Testing Gemini API connection.");
                
                // First check if the service is configured
                if (!_geminiService.IsConfigured())
                {
                    _logger.LogWarning("Gemini service is not configured");
                    return Ok(new { isConnected = false, error = "Gemini API key is not configured" });
                }
                
                try
                {
                    // Use a simple prompt and a potentially cheaper/faster model for testing
                    var testResponse = await _geminiService.ChatAsync("Hello", "gemini-1.5-flash"); 
                    bool isConnected = testResponse != null && !string.IsNullOrEmpty(testResponse.Content);
                    
                    _logger.LogInformation("Gemini API connection test result: {IsConnected}", isConnected);
                    return Ok(new { isConnected });
                }
                catch (HttpRequestException httpEx)
                {
                    _logger.LogError(httpEx, "HTTP error testing Gemini connection");
                    return Ok(new { isConnected = false, error = "Failed to connect to Gemini API: " + httpEx.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error testing Gemini connection");
                return Ok(new { isConnected = false, error = "Unexpected error: " + ex.Message });
            }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] GeminiRequest request, [FromQuery] string modelId = "gemini-1.5-pro")
        {
            var response = await _geminiService.GenerateContentAsync(request, modelId);
            return Ok(response);
        }
        
        [HttpGet("models")]
        public async Task<IActionResult> ListModels([FromQuery] int? pageSize = null, [FromQuery] string? pageToken = null)
        {
            try
            {
                var models = await _geminiService.ListModelsAsync(pageSize, pageToken);
                return Ok(new { models });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing Gemini models");
                return StatusCode(500, new { error = "Failed to list models", details = ex.Message });
            }
        }
        
        [HttpGet("models/{modelId}")]
        public async Task<IActionResult> GetModelDetails(string modelId)
        {
            try
            {
                var model = await _geminiService.GetModelDetailsAsync(modelId);
                return Ok(model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting model details for {ModelId}", modelId);
                return StatusCode(500, new { error = "Failed to get model details", details = ex.Message });
            }
        }
        
        [HttpPost("count-tokens")]
        public async Task<IActionResult> CountTokens([FromBody] GeminiRequest request, [FromQuery] string modelId = "gemini-1.5-pro")
        {
            try
            {
                var tokenCount = await _geminiService.CountTokensAsync(request, modelId);
                return Ok(tokenCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error counting tokens for model {ModelId}", modelId);
                return StatusCode(500, new { error = "Failed to count tokens", details = ex.Message });
            }
        }
        
        [HttpPost("embeddings")]
        public async Task<IActionResult> GenerateEmbedding([FromBody] EmbeddingRequest request, [FromQuery] string modelId = "gemini-embedding-exp")
        {
            try
            {
                var embedding = await _geminiService.GenerateEmbeddingAsync(request, modelId);
                return Ok(embedding);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating embedding for model {ModelId}", modelId);
                return StatusCode(500, new { error = "Failed to generate embedding", details = ex.Message });
            }
        }
        
        [HttpPost("batch-embeddings")]
        public async Task<IActionResult> GenerateBatchEmbeddings([FromBody] BatchEmbeddingRequest request, [FromQuery] string modelId = "gemini-embedding-exp")
        {
            try
            {
                var embeddings = await _geminiService.GenerateBatchEmbeddingsAsync(request, modelId);
                return Ok(embeddings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating batch embeddings for model {ModelId}", modelId);
                return StatusCode(500, new { error = "Failed to generate batch embeddings", details = ex.Message });
            }
        }
        
        [HttpPost("upload-file")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded or file is empty");
            }
            
            try
            {
                using var stream = file.OpenReadStream();
                var response = await _geminiService.UploadFileAsync(stream, file.FileName, file.ContentType);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file {FileName}", file.FileName);
                return StatusCode(500, new { error = "Failed to upload file", details = ex.Message });
            }
        }
        
        [HttpDelete("files/{fileId}")]
        public async Task<IActionResult> DeleteFile(string fileId)
        {
            try
            {
                var success = await _geminiService.DeleteFileAsync(fileId);
                return Ok(new { success });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file {FileId}", fileId);
                return StatusCode(500, new { error = "Failed to delete file", details = ex.Message });
            }
        }
        
        [HttpPost("generate-image")]
        public async Task<IActionResult> GenerateImage([FromBody] ImageGenerationRequest request, [FromQuery] string modelId = "imagen-3.0-generate-002")
        {
            try
            {
                var response = await _geminiService.GenerateImageAsync(request, modelId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image with model {ModelId}", modelId);
                return StatusCode(500, new { error = "Failed to generate image", details = ex.Message });
            }
        }
    }

    public class ChatRequest
    {
        public required string Message { get; set; }
        public required string ModelId { get; set; }
    }

    public class StreamChatRequest
    {
        public required string Message { get; set; }
        public string? ModelId { get; set; }
        public GenerationConfig? GenerationConfig { get; set; }
        public SafetySetting[]? SafetySettings { get; set; }
    }
}
