using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.DTOs.Llama;
using SecondBrain.Api.Services;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LlamaController : ControllerBase
    {
        private readonly ILlamaService _llamaService;
        private readonly ILogger<LlamaController> _logger;

        public LlamaController(ILlamaService llamaService, ILogger<LlamaController> logger)
        {
            _llamaService = llamaService;
            _logger = logger;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] LlamaRequest request)
        {
            if (string.IsNullOrEmpty(request.Prompt))
            {
                return BadRequest("Prompt is required.");
            }

            try
            {
                var responseText = await _llamaService.GenerateTextAsync(request.Prompt, request.ModelName);
                var response = new LlamaResponse
                {
                    Content = responseText,
                    Model = _llamaService.GetType().Name
                };

                return Ok(response);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error in LlamaController.SendMessage");
                return StatusCode(500, "Failed to process the request.");
            }
        }
    }
} 