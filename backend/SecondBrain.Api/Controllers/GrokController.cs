using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using SecondBrain.Api.DTOs.Grok;
using System.Threading.Tasks;
using System.Net.Http.Json;
using System.Net.Security;
using System.Text.Json;
using System.Security.Authentication;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GrokController : ControllerBase
    {
        private readonly ILogger<GrokController> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        public GrokController(ILogger<GrokController> logger, IConfiguration configuration, IWebHostEnvironment environment)
        {
            _logger = logger;
            
            var handler = new HttpClientHandler();
            handler.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;
            _httpClient = new HttpClient(handler);
            
            _baseUrl = configuration["Grok:BaseUrl"] 
                ?? throw new ArgumentException("Grok base URL not configured");
            
            var apiKey = configuration["Grok:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new ArgumentException("Grok API key not configured");
            }
            _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        }

        [HttpPost("send")]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            try
            {
                _logger.LogInformation("Sending message to Grok API. Model: {Model}", request.Model);
                
                var response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/chat/completions",
                    request
                );

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("Grok API Raw Response: {Response}", responseContent);

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var result = await response.Content.ReadFromJsonAsync<SendMessageResponse>();
                        return Ok(result);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Failed to deserialize Grok response: {Response}", responseContent);
                        return BadRequest(new { error = "Failed to parse Grok response", details = ex.Message });
                    }
                }

                _logger.LogError("Grok API Error: {StatusCode} - {Error}", 
                    response.StatusCode, responseContent);
                return BadRequest(new { error = $"Failed to get response from Grok: {responseContent}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GrokController.SendMessage");
                return StatusCode(500, new { error = "Internal server error", details = ex.Message });
            }
        }

        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                _logger.LogInformation("Testing Grok API connection");
                
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

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("Grok API Test Response: {Response}", responseContent);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Grok API Test Failed: {StatusCode} - {Error}", 
                        response.StatusCode, responseContent);
                }

                return Ok(new { 
                    isConnected = response.IsSuccessStatusCode,
                    error = !response.IsSuccessStatusCode ? responseContent : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing Grok connection");
                return Ok(new { 
                    isConnected = false, 
                    error = "Failed to test Grok connection: " + ex.Message 
                });
            }
        }

        [HttpPost("function-call")]
        [Authorize]
        public async Task<IActionResult> ExecuteFunctionCall([FromBody] SendMessageRequest request)
        {
            try
            {
                _logger.LogInformation("Executing function call with Grok API. Model: {Model}", request.Model);

                request.Tools ??= Array.Empty<Tool>();
                request.Messages ??= Array.Empty<Message>();
                foreach (var message in request.Messages)
                {
                    message.ToolCalls ??= Array.Empty<ToolCall>();
                    message.ToolCallId ??= string.Empty;
                }

                var response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/chat/completions",
                    request
                );

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogDebug("Grok API Function Call Response: {Response}", responseContent);

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var result = await response.Content.ReadFromJsonAsync<SendMessageResponse>();
                        return Ok(result);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Failed to deserialize Grok function call response: {Response}", responseContent);
                        return BadRequest(new { error = "Failed to parse Grok response", details = ex.Message });
                    }
                }

                _logger.LogError("Grok API Function Call Error: {StatusCode} - {Error}", 
                    response.StatusCode, responseContent);
                return BadRequest(new { error = $"Failed to get response from Grok: {responseContent}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GrokController.ExecuteFunctionCall");
                return StatusCode(500, new { error = "Internal server error", details = ex.Message });
            }
        }
    }
}