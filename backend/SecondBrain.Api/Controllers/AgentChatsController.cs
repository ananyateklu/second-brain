using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.DTOs.Agent;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Text.Json;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AgentChatsController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<AgentChatsController> _logger;

        public AgentChatsController(DataContext context, ILogger<AgentChatsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<List<AgentChatResponse>>> GetChats()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var chats = await _context.AgentChats
                .Include(c => c.Messages)
                .Where(c => c.UserId == userId && !c.IsDeleted)
                .OrderByDescending(c => c.LastUpdated)
                .ToListAsync();

            return Ok(chats.Select(MapToResponse));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AgentChatResponse>> GetChat(string id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var chat = await _context.AgentChats
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId && !c.IsDeleted);

            if (chat == null)
                return NotFound();

            return Ok(MapToResponse(chat));
        }

        [HttpPost]
        public async Task<ActionResult<AgentChatResponse>> CreateChat([FromBody] CreateChatRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var chat = new AgentChat
            {
                UserId = userId,
                ModelId = request.ModelId,
                Title = request.Title ?? "New Chat",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow,
                ChatSource = request.ChatSource
            };

            _context.AgentChats.Add(chat);
            await _context.SaveChangesAsync();

            return Ok(MapToResponse(chat));
        }

        [HttpPost("{chatId}/messages")]
        public async Task<ActionResult<AgentMessageResponse>> AddMessage(
            string chatId,
            [FromBody] AddMessageRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null)
            {
                return Unauthorized();
            }

            var chat = await _context.AgentChats
                .FirstOrDefaultAsync(c => c.Id == chatId && c.UserId == userId && !c.IsDeleted);

            if (chat == null)
                return NotFound($"Chat with ID {chatId} not found");

            var message = new AgentMessage
            {
                ChatId = chatId,
                Role = request.Role,
                Content = request.Content,
                Status = request.Status ?? "sent",
                Metadata = request.Metadata != null ? JsonSerializer.Serialize(request.Metadata) : null,
                Timestamp = DateTime.UtcNow
            };

            chat.LastUpdated = DateTime.UtcNow;
            _context.AgentMessages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(MapMessageToResponse(message));
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteChat(string id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var chat = await _context.AgentChats
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            if (chat == null)
                return NotFound();

            chat.IsDeleted = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static AgentChatResponse MapToResponse(AgentChat chat)
        {
            return new AgentChatResponse
            {
                Id = chat.Id,
                ModelId = chat.ModelId,
                Title = chat.Title,
                LastUpdated = chat.LastUpdated,
                IsActive = chat.IsActive,
                ChatSource = chat.ChatSource,
                Messages = chat.Messages
                    .OrderBy(m => m.Timestamp)
                    .Select(MapMessageToResponse)
                    .ToList()
            };
        }

        private static AgentMessageResponse MapMessageToResponse(AgentMessage message)
        {
            return new AgentMessageResponse
            {
                Id = message.Id,
                Role = message.Role,
                Content = message.Content,
                Timestamp = message.Timestamp,
                Status = message.Status,
                Reactions = !string.IsNullOrEmpty(message.Reactions)
                    ? JsonSerializer.Deserialize<List<string>>(message.Reactions) ?? new List<string>()
                    : new List<string>(),
                Metadata = !string.IsNullOrEmpty(message.Metadata)
                    ? JsonSerializer.Deserialize<Dictionary<string, object>>(message.Metadata) ?? new Dictionary<string, object>()
                    : new Dictionary<string, object>()
            };
        }
    }

    public class CreateChatRequest
    {
        public required string ModelId { get; set; }
        public string? Title { get; set; }
        public string? ChatSource { get; set; }
    }

    public class AddMessageRequest
    {
        public required string Role { get; set; }
        public required string Content { get; set; }
        public string? Status { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }
}