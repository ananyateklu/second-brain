using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.DTOs.Ideas;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class IdeasController : ControllerBase
    {
        private const string IdeaNotFoundError = "Idea not found.";
        private readonly DataContext _context;

        public IdeasController(DataContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<Idea>> CreateIdea([FromBody] CreateIdeaRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var idea = new Idea
            {
                Id = Guid.NewGuid().ToString(),
                Title = request.Title,
                Content = request.Content,
                Tags = string.Join(",", request.Tags),
                IsFavorite = request.IsFavorite,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Ideas.Add(idea);
            await _context.SaveChangesAsync();

            return Ok(idea);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateIdea(string id, [FromBody] UpdateIdeaRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var idea = await _context.Ideas.FindAsync(id);

            if (idea == null || idea.UserId != userId)
            {
                return NotFound(new { error = IdeaNotFoundError });
            }

            idea.Title = request.Title;
            idea.Content = request.Content;
            idea.Tags = string.Join(",", request.Tags);
            idea.IsFavorite = request.IsFavorite;
            idea.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(idea);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIdea(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var idea = await _context.Ideas.FindAsync(id);

            if (idea == null || idea.UserId != userId)
            {
                return NotFound(new { error = IdeaNotFoundError });
            }

            _context.Ideas.Remove(idea);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Idea deleted successfully." });
        }

        [HttpPut("{id}/favorite")]
        public async Task<IActionResult> ToggleFavorite(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var idea = await _context.Ideas.FindAsync(id);

            if (idea == null || idea.UserId != userId)
            {
                return NotFound(new { error = IdeaNotFoundError });
            }

            idea.IsFavorite = !idea.IsFavorite;
            idea.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(idea);
        }

        [HttpPut("{id}/pin")]
        public async Task<IActionResult> TogglePin(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var idea = await _context.Ideas.FindAsync(id);

            if (idea == null || idea.UserId != userId)
            {
                return NotFound(new { error = IdeaNotFoundError });
            }

            idea.IsPinned = !idea.IsPinned;
            idea.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(idea);
        }

        [HttpPut("{id}/archive")]
        public async Task<IActionResult> ToggleArchive(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var idea = await _context.Ideas.FindAsync(id);

            if (idea == null || idea.UserId != userId)
            {
                return NotFound(new { error = IdeaNotFoundError });
            }

            idea.IsArchived = !idea.IsArchived;
            idea.ArchivedAt = idea.IsArchived ? DateTime.UtcNow : null;
            idea.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(idea);
        }
    }
}