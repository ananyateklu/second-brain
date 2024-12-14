using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Agent;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIAgentsController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AIAgentsController> _logger;
        private readonly string _aiServiceUrl;

        public AIAgentsController(
            HttpClient httpClient,
            ILogger<AIAgentsController> logger,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _aiServiceUrl = configuration["AIService:BaseUrl"] ?? "http://localhost:8000";
        }

        [HttpGet("health")]
        public async Task<IActionResult> HealthCheck()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_aiServiceUrl}/health");
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<object>();
                    return Ok(result);
                }
                return StatusCode((int)response.StatusCode, "AI Service health check failed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking AI service health");
                return StatusCode(500, new { error = "Failed to connect to AI service" });
            }
        }

        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteAgent([FromBody] AgentRequest request)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"{_aiServiceUrl}/agent/execute", 
                    request
                );
                
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<AgentResponse>();
                    return Ok(result);
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("AI Service error: {ErrorContent}", errorContent);
                return StatusCode((int)response.StatusCode, errorContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing agent");
                return StatusCode(500, new { error = "Failed to execute agent" });
            }
        }
    }
}