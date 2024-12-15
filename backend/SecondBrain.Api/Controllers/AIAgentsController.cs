using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Models.Agent;
using Microsoft.AspNetCore.Cors;
using System.Text;

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
            
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
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
                
                // Convert request to snake_case format for Python API
                var requestDict = request.ToSnakeCase();
                var jsonContent = JsonSerializer.Serialize(requestDict, _jsonOptions);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                
                var response = await _httpClient.PostAsync($"{_aiServiceUrl}/agent/execute", content);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var result = JsonSerializer.Deserialize<AgentResponse>(responseContent, _jsonOptions);
                        if (result == null)
                        {
                            throw new JsonException("Deserialized response is null");
                        }
                        return Ok(result);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Failed to deserialize AI service response: {Content}", responseContent);
                        return StatusCode(500, new { 
                            error = "Failed to process AI service response",
                            details = ex.Message
                        });
                    }
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

        [HttpPost("batch")]
        [ProducesResponseType(typeof(List<AgentResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ExecuteBatchAgents([FromBody] List<AgentRequest> requests)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var responses = new List<AgentResponse>();
            var errors = new List<object>();

            foreach (var request in requests)
            {
                try
                {
                    var result = await ExecuteAgent(request) as ObjectResult;
                    if (result?.Value is AgentResponse response)
                    {
                        responses.Add(response);
                    }
                    else
                    {
                        errors.Add(new { 
                            request = request,
                            error = "Failed to process request",
                            details = result?.Value
                        });
                    }
                }
                catch (Exception ex)
                {
                    errors.Add(new { 
                        request = request,
                        error = "Request failed",
                        details = ex.Message
                    });
                }
            }

            return Ok(new { 
                responses = responses,
                errors = errors,
                summary = new {
                    total = requests.Count,
                    successful = responses.Count,
                    failed = errors.Count
                }
            });
        }
    }
}