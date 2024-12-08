using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.Services;
using SecondBrain.Api.DTOs.RAG;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/ai/rag")]
    public class RagController : ControllerBase
    {
        private readonly RagService _ragService;
        private readonly ILogger<RagController> _logger;

        public RagController(RagService ragService, ILogger<RagController> logger)
        {
            _ragService = ragService;
            _logger = logger;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            try
            {
                using var stream = file.OpenReadStream();
                var fileId = await _ragService.UploadFileAsync(stream, file.FileName);
                return Ok(new { fileId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("assistant")]
        public async Task<IActionResult> CreateAssistant([FromBody] CreateAssistantRequest request)
        {
            try
            {
                var assistantId = await _ragService.CreateAssistantAsync(
                    request.FileId,
                    request.Instructions
                );
                return Ok(new { assistantId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating assistant");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("query")]
        public async Task<IActionResult> QueryAssistant([FromBody] QueryRequest request)
        {
            try
            {
                var response = await _ragService.GetAssistantResponseAsync(
                    request.AssistantId,
                    request.Prompt
                );
                return Ok(new { response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying assistant");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("assistant/{assistantId}")]
        public async Task<IActionResult> DeleteAssistant(string assistantId)
        {
            try
            {
                await _ragService.DeleteAssistantAsync(assistantId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting assistant");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("file/{fileId}")]
        public async Task<IActionResult> DeleteFile(string fileId)
        {
            try
            {
                await _ragService.DeleteFileAsync(fileId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
} 