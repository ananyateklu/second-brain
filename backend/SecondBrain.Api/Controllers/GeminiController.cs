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

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] GeminiRequest request)
        {
            var response = await _geminiService.GenerateContentAsync(request);
            return Ok(response);
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; }
        public string ModelId { get; set; }
    }
}
