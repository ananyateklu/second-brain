using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Anthropic;
using SecondBrain.Api.Services;
using System.Collections.Generic;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClaudeController : ControllerBase
    {
        private readonly IAnthropicService _anthropicService;
        private readonly ILogger<ClaudeController> _logger;


        public ClaudeController(IAnthropicService anthropicService, ILogger<ClaudeController> logger)
        {
            _anthropicService = anthropicService;
            _logger = logger;
        }

        /// <summary>
        /// Sends a message to Claude and retrieves the response.
        /// </summary>
        /// <param name="request">The message request containing model, max_tokens, and messages.</param>
        /// <returns>The response from Claude.</returns>
        [HttpPost("send")]
        [Authorize] // Ensure the endpoint is secured; adjust as necessary
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body cannot be null." });
            }

            if (string.IsNullOrWhiteSpace(request.Model))
            {
                return BadRequest(new { error = "Model ID is required." });
            }

            if (request.Messages == null || !request.Messages.Any())
            {
                return BadRequest(new { error = "Messages cannot be empty." });
            }

            try
            {
                var response = await _anthropicService.SendMessageAsync(request);
                return Ok(response);
            }
            catch (AnthropicException ex)
            {
                _logger.LogError(ex, "Anthropic API Error: {Message}", ex.Message);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Error: {Message}", ex.Message);
                return StatusCode(500, new { error = "Internal server error." });
            }
        }

        /// <summary>
        /// Tests the Claude API connection.
        /// </summary>
        /// <returns>Boolean indicating connection status.</returns>
        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnectionAsync()
        {
            try
            {
                var testRequest = new SendMessageRequest
                {
                    Model = "claude-3-5-sonnet-20241022",
                    MaxTokens = 1024,
                    Messages = new List<Message>
                    {
                        new Message { Role = "user", Content = "Hello, Claude!" }
                    }
                };

                var testResponse = await _anthropicService.SendMessageAsync(testRequest);
                bool isSuccess = testResponse.Content != null && testResponse.Content.Any();
                return Ok(new { isConnected = isSuccess });
            }
            catch (AnthropicException ex)
            {
                _logger.LogError(ex, "Anthropic API Error during connection test: {Message}", ex.Message);
                return StatusCode(500, new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected Error during connection test: {Message}", ex.Message);
                return StatusCode(500, new { error = "Internal server error." });
            }
        }
    }
}
