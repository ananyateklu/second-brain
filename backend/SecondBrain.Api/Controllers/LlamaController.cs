using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Services;
using System.Text.Json;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LlamaController : ControllerBase
    {
        private readonly ILlamaService _llamaService;
        private readonly ILogger<LlamaController> _logger;

        public LlamaController(
            ILlamaService llamaService,
            ILogger<LlamaController> logger)
        {
            _llamaService = llamaService;
            _logger = logger;
        }

        [HttpGet("stream")]
        public async Task StreamResponse([FromQuery] string prompt, [FromQuery] string modelId)
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            try
            {
                // Direct model response for local models
                var response = await _llamaService.GenerateTextAsync(prompt, modelId, 2048);
                var update = new
                {
                    Type = "content",
                    Content = response,
                    Timestamp = DateTime.UtcNow
                };
                
                var json = JsonSerializer.Serialize(update);
                await Response.WriteAsync($"data: {json}\n\n");
                await Response.Body.FlushAsync();

                await Response.WriteAsync($"event: complete\ndata: {{}}\n\n");
                await Response.Body.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing stream request");
                throw new InvalidOperationException("Failed to process LLM stream request", ex);
            }
        }
    }
} 