using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Gemini;
using SecondBrain.Api.Services;
using System;
using System.Threading.Tasks;

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

        [HttpGet("test-connection")]
        [AllowAnonymous] // Or use [Authorize] if authentication is required for this check
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                _logger.LogInformation("Testing Gemini API connection.");
                // Use a simple prompt and a potentially cheaper/faster model for testing
                var testResponse = await _geminiService.ChatAsync("Hello", "gemini-1.5-flash"); 
                bool isConnected = !string.IsNullOrEmpty(testResponse?.Content?.ToString());
                
                _logger.LogInformation("Gemini API connection test result: {IsConnected}", isConnected);
                return Ok(new { isConnected = isConnected });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing Gemini connection");
                return Ok(new { isConnected = false, error = ex.Message });
            }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] GeminiRequest request)
        {
            var response = await _geminiService.GenerateContentAsync(request);
            return Ok(response);
        }
    }

    public class ChatRequest
    {
        public required string Message { get; set; }
        public required string ModelId { get; set; }
    }
}
