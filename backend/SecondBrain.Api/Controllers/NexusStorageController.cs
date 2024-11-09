using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Services;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NexusStorageController : ControllerBase
    {
        private readonly ILlamaService _llamaService;
        private readonly ILogger<NexusStorageController> _logger;

        public NexusStorageController(ILlamaService llamaService, ILogger<NexusStorageController> logger)
        {
            _llamaService = llamaService;
            _logger = logger;
        }

        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteOperation([FromBody] string prompt)
        {
            try
            {
                var result = await _llamaService.ExecuteDatabaseOperationAsync(prompt);
                return Ok(new { content = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing database operation");
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestOperation([FromBody] string prompt)
        {
            try
            {
                var response = await _llamaService.GenerateTextAsync(prompt, "nexusraven");
                return Ok(new { rawResponse = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in test operation");
                return BadRequest(new { error = ex.Message, details = ex.ToString() });
            }
        }
    }
} 