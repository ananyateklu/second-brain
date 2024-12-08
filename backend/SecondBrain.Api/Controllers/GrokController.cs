using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Grok;
using System.Threading.Tasks;
using System.Net.Http.Json;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GrokController : ControllerBase
    {
        private readonly ILogger<GrokController> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        public GrokController(ILogger<GrokController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _httpClient = new HttpClient();
            
            _baseUrl = configuration["Grok:BaseUrl"] 
                ?? throw new ArgumentException("Grok base URL not configured");
            
            var apiKey = configuration["Grok:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new ArgumentException("Grok API key not configured");
            }
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
        }

        [HttpPost("send")]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/chat/completions",
                    request
                );

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<SendMessageResponse>();
                    return Ok(result);
                }

                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Grok API Error: {Error}", error);
                return BadRequest(new { error = "Failed to get response from Grok" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GrokController.SendMessage");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var testRequest = new SendMessageRequest
                {
                    Model = "grok-beta",
                    Messages = new[]
                    {
                        new Message { Role = "user", Content = "Hello, Grok!" }
                    },
                    Stream = false,
                    Temperature = 0
                };

                var response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/chat/completions",
                    testRequest
                );

                return Ok(new { isConnected = response.IsSuccessStatusCode });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing Grok connection");
                return StatusCode(500, new { error = "Failed to test Grok connection" });
            }
        }

        [HttpPost("function-call")]
        [Authorize]
        public async Task<IActionResult> ExecuteFunctionCall([FromBody] SendMessageRequest request)
        {
            try
            {
                if (request.Tools == null)
                {
                    request.Tools = Array.Empty<Tool>();
                }

                foreach (var message in request.Messages)
                {
                    message.ToolCalls ??= Array.Empty<ToolCall>();
                    message.ToolCallId ??= string.Empty;
                }

                var response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/chat/completions",
                    request
                );

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<SendMessageResponse>();
                    return Ok(result);
                }

                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Grok API Error: {Error}", error);
                return BadRequest(new { error = "Failed to get response from Grok" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GrokController.ExecuteFunctionCall");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}