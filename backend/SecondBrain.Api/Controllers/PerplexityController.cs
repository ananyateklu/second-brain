using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.DTOs.Perplexity;
using SecondBrain.Api.Services;
using SecondBrain.Api.Constants;

namespace SecondBrain.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/perplexity")]
    public class PerplexityController : ControllerBase
    {
        private readonly IPerplexityService _perplexityService;
        private readonly ILogger<PerplexityController> _logger;

        public PerplexityController(
            IPerplexityService perplexityService,
            ILogger<PerplexityController> logger)
        {
            _perplexityService = perplexityService;
            _logger = logger;
        }

        /// <summary>
        /// Search using Perplexity API
        /// </summary>
        /// <remarks>
        /// Available models:
        /// - sonar: Lightweight search model
        /// - sonar-pro: Advanced search model
        /// - sonar-deep-research: Research model
        /// - sonar-reasoning: Fast reasoning model
        /// - sonar-reasoning-pro: Advanced reasoning model
        /// </remarks>
        [HttpPost("search")]
        public async Task<IActionResult> Search([FromBody] SearchRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Query))
                {
                    return BadRequest("Search query cannot be empty");
                }

                _logger.LogInformation("Processing search request: {Query}", request.Query);
                var response = await _perplexityService.SearchAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search request");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Send a message directly to Perplexity API
        /// </summary>
        /// <remarks>
        /// Available models:
        /// - sonar: Lightweight search model
        /// - sonar-pro: Advanced search model
        /// - sonar-deep-research: Research model
        /// - sonar-reasoning: Fast reasoning model
        /// - sonar-reasoning-pro: Advanced reasoning model
        /// </remarks>
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] PerplexityRequest request)
        {
            try
            {
                if (request.Messages == null || request.Messages.Count == 0)
                {
                    return BadRequest("Messages cannot be empty");
                }

                _logger.LogInformation("Sending message to Perplexity API");
                var response = await _perplexityService.SendMessageAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to Perplexity API");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Test the connection to Perplexity API
        /// </summary>
        [HttpGet("test-connection")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                _logger.LogInformation("Testing connection to Perplexity API");
                var isConnected = await _perplexityService.TestConnectionAsync();
                return Ok(new { isConnected });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing connection to Perplexity API");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get available Perplexity AI models
        /// </summary>
        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            try
            {
                _logger.LogInformation("Fetching available Perplexity models");
                var models = await _perplexityService.GetAvailableModelsAsync();
                return Ok(models);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Perplexity models");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
} 