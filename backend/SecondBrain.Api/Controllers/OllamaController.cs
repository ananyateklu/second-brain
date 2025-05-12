using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Services;
using System.Text.Json;
using SecondBrain.Api.DTOs.Ollama;
using System.Net.Mime;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OllamaController : ControllerBase
    {
        private readonly IOllamaService _ollamaService;
        private readonly ILogger<OllamaController> _logger;

        public OllamaController(
            IOllamaService ollamaService,
            ILogger<OllamaController> logger)
        {
            _ollamaService = ollamaService;
            _logger = logger;
        }

        [HttpGet("models")]
        [ProducesResponseType(typeof(OllamaModelsResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetModels()
        {
            try
            {
                var models = await _ollamaService.GetAvailableModelsAsync();
                return Ok(models);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Ollama models: {Message}", ex.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
            }
        }

        [HttpGet("stream")]
        public async Task StreamText([FromQuery] string prompt, [FromQuery] string modelId, [FromQuery] int numPredict = 2048)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            try
            {
                await _ollamaService.StreamGenerateTextAsync(prompt, modelId, async (token) =>
                {
                    var response = new
                    {
                        Type = "content",
                        Content = token
                    };

                    string jsonResponse = JsonSerializer.Serialize(response);
                    await Response.WriteAsync($"data: {jsonResponse}\n\n", Encoding.UTF8);
                    await Response.Body.FlushAsync();
                }, numPredict);

                // Send completion event
                await Response.WriteAsync($"event: complete\ndata: {{}}\n\n", Encoding.UTF8);
                await Response.Body.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error streaming response from Ollama: {Message}", ex.Message);
                
                var errorResponse = new
                {
                    Type = "error",
                    Content = $"Error: {ex.Message}"
                };

                string jsonErrorResponse = JsonSerializer.Serialize(errorResponse);
                await Response.WriteAsync($"data: {jsonErrorResponse}\n\n", Encoding.UTF8);
                await Response.Body.FlushAsync();
            }
        }

        [HttpPost("stream")]
        public async Task StreamText([FromBody] OllamaRequest request)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            try
            {
                await _ollamaService.StreamGenerateTextAsync(request.Prompt, request.ModelId, async (token) =>
                {
                    var response = new
                    {
                        Type = "content",
                        Content = token
                    };

                    string jsonResponse = JsonSerializer.Serialize(response);
                    await Response.WriteAsync($"data: {jsonResponse}\n\n", Encoding.UTF8);
                    await Response.Body.FlushAsync();
                }, request.NumPredict);

                // Send completion event
                await Response.WriteAsync($"event: complete\ndata: {{}}\n\n", Encoding.UTF8);
                await Response.Body.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error streaming response from Ollama: {Message}", ex.Message);
                
                var errorResponse = new
                {
                    Type = "error",
                    Content = $"Error: {ex.Message}"
                };

                string jsonErrorResponse = JsonSerializer.Serialize(errorResponse);
                await Response.WriteAsync($"data: {jsonErrorResponse}\n\n", Encoding.UTF8);
                await Response.Body.FlushAsync();
            }
        }
    }
} 