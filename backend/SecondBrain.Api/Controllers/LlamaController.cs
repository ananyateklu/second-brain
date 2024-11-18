using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SecondBrain.Api.Hubs;
using SecondBrain.Api.Services;
using SecondBrain.Api.Models;
using System.Text.Json;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LlamaController : ControllerBase
    {
        private readonly ILlamaService _llamaService;
        private readonly IHubContext<ToolHub> _hubContext;
        private readonly ILogger<LlamaController> _logger;

        public LlamaController(
            ILlamaService llamaService,
            IHubContext<ToolHub> hubContext,
            ILogger<LlamaController> logger)
        {
            _llamaService = llamaService;
            _hubContext = hubContext;
            _logger = logger;
        }

        [HttpGet("stream")]
        public async Task StreamResponse([FromQuery] string prompt, [FromQuery] string modelId)
        {
            Response.Headers.Add("Content-Type", "text/event-stream");
            Response.Headers.Add("Cache-Control", "no-cache");
            Response.Headers.Add("Connection", "keep-alive");

            try
            {
                if (modelId.Contains("function"))  // or whatever identifier you use for function-calling models
                {
                    // Generate a message ID for this request
                    var messageId = Guid.NewGuid().ToString();
                    var response = await _llamaService.ExecuteDatabaseOperationAsync(prompt, messageId, 2048);
                    
                    var update = new
                    {
                        Type = "content",
                        Content = response,
                        Timestamp = DateTime.UtcNow
                    };
                    
                    var json = JsonSerializer.Serialize(update);
                    await Response.WriteAsync($"data: {json}\n\n");
                    await Response.Body.FlushAsync();
                }
                else
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
                }

                await Response.WriteAsync($"event: complete\ndata: {{}}\n\n");
                await Response.Body.FlushAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing stream request");
                throw;
            }
        }
    }
} 