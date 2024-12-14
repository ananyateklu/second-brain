using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Agent;
using Microsoft.AspNetCore.Cors;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowFrontend")]
    public class AIAgentsController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AIAgentsController> _logger;
        private readonly string _aiServiceUrl;
        private readonly JsonSerializerOptions _jsonOptions;

        public AIAgentsController(
            HttpClient httpClient,
            ILogger<AIAgentsController> logger,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _aiServiceUrl = configuration["AIService:BaseUrl"] ?? "http://localhost:8000";
            
            // Options for receiving responses (camelCase)
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        [HttpGet("health")]
        public async Task<IActionResult> HealthCheck()
        {
            try
            {
                _logger.LogInformation("Checking AI service health at {Url}", _aiServiceUrl);
                var response = await _httpClient.GetAsync($"{_aiServiceUrl}/health");
                
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<object>(_jsonOptions);
                    return Ok(result);
                }
                
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("AI Service health check failed: {Error}", errorContent);
                return StatusCode((int)response.StatusCode, new { error = "AI Service health check failed", details = errorContent });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking AI service health");
                return StatusCode(500, new { error = "Failed to connect to AI service", details = ex.Message });
            }
        }

        [HttpPost("execute")]
        [ProducesResponseType(typeof(AgentResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExecuteAgent([FromBody] AgentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                _logger.LogInformation("Executing agent with model {ModelId}", request.ModelId);
                
                // Convert the request to a dictionary to ensure proper snake_case serialization
                var requestDict = new Dictionary<string, object>
                {
                    { "model_id", request.ModelId },
                    { "prompt", request.Prompt },
                    { "max_tokens", request.MaxTokens ?? 1000 },
                    { "temperature", request.Temperature ?? 0.7 },
                    { "tools", request.Tools ?? new List<Dictionary<string, object>>() }
                };
                
                var jsonContent = JsonSerializer.Serialize(requestDict);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
                
                var response = await _httpClient.PostAsync($"{_aiServiceUrl}/agent/execute", content);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    var result = JsonSerializer.Deserialize<AgentResponse>(responseContent, _jsonOptions);
                    return Ok(result);
                }

                _logger.LogError("AI Service error: {StatusCode} {Content}", 
                    response.StatusCode, responseContent);
                    
                return StatusCode((int)response.StatusCode, new { 
                    error = "AI Service execution failed",
                    details = responseContent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing agent");
                return StatusCode(500, new { 
                    error = "Failed to execute agent",
                    details = ex.Message
                });
            }
        }
    }

    public class SnakeCaseNamingPolicy : JsonNamingPolicy
    {
        public override string ConvertName(string name)
        {
            if (string.IsNullOrEmpty(name))
                return name;

            var result = new System.Text.StringBuilder();
            for (int i = 0; i < name.Length; i++)
            {
                if (i > 0 && char.IsUpper(name[i]))
                {
                    result.Append('_');
                }
                result.Append(char.ToLower(name[i]));
            }
            return result.ToString();
        }
    }
}