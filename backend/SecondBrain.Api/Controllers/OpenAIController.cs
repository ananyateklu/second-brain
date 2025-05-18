using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.OpenAI;
using SecondBrain.Api.Services;
using SecondBrain.Api.Exceptions;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/ai/openai")]
    public class OpenAIController : ControllerBase
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<OpenAIController> _logger;

        public OpenAIController(IOpenAIService openAIService, ILogger<OpenAIController> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var isConnected = await _openAIService.TestConnectionAsync();
                return Ok(new { isConfigured = isConnected });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking OpenAI status");
                return StatusCode(500, new { error = "Failed to check OpenAI status" });
            }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                var response = await _openAIService.SendMessageAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to OpenAI");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("embeddings")]
        public async Task<IActionResult> CreateEmbeddings([FromBody] EmbeddingsRequest request)
        {
            try
            {
                var response = await _openAIService.CreateEmbeddingsAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating embeddings");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("images/generate")]
        public async Task<IActionResult> GenerateImage([FromBody] ImageGenerationRequest request)
        {
            try
            {
                _logger.LogInformation("Received image generation request");
                
                var response = await _openAIService.GenerateImageAsync(request);
                
                // Return a simplified response structure
                return Ok(new { 
                    data = new[] { 
                        new { url = response.Data[0].Url } 
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("audio/transcribe")]
        public async Task<IActionResult> TranscribeAudio(IFormFile file)
        {
            try
            {
                var response = await _openAIService.TranscribeAudioAsync(file);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transcribing audio");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("audio/speech")]
        public async Task<IActionResult> TextToSpeech([FromBody] TextToSpeechRequest request)
        {
            try
            {
                var response = await _openAIService.TextToSpeechAsync(request);
                
                // Return the audio stream directly with the correct content type
                return File(response.AudioStream, "audio/mpeg");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting text to speech");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves a list of available OpenAI models.
        /// </summary>
        /// <returns>A list of available OpenAI models.</returns>
        [HttpGet("models")]
        [Authorize] // Ensure endpoint is secured if needed, consistent with Anthropic
        public async Task<IActionResult> GetAvailableModels()
        {
            try
            {
                _logger.LogInformation("Attempting to fetch available OpenAI models.");
                var modelsResponse = await _openAIService.GetModelsAsync();
                _logger.LogInformation("Successfully fetched {ModelCount} OpenAI models.", modelsResponse.Data.Count);
                return Ok(modelsResponse); // Return the full DTO for now
            }
            catch (OpenAIException ex)
            {
                _logger.LogError(ex, "OpenAI API Error while fetching models: {Message}", ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Error while fetching OpenAI models: {Message}", ex.Message);
                return StatusCode(500, new { error = "Internal server error while fetching OpenAI models." });
            }
        }
    }
} 