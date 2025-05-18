using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.DTOs.Ideas;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Security.Claims;
using SecondBrain.Api.Gamification;
using SecondBrain.Api.Enums;
using SecondBrain.Services.Gamification;
using System.Linq;
using SecondBrain.Api.Services;

namespace SecondBrain.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class IdeasController : ControllerBase
    {
        private const string IdeaNotFoundError = "Source idea not found, or it is deleted/archived.";
        private readonly DataContext _context;
        private readonly IXPService _xpService;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<IdeasController> _logger;
        private readonly IActivityLogger _activityLogger;

        public IdeasController(DataContext context, IXPService xpService, IAchievementService achievementService, ILogger<IdeasController> logger, IActivityLogger activityLogger)
        {
            _context = context;
            _xpService = xpService;
            _achievementService = achievementService;
            _logger = logger;
            _activityLogger = activityLogger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<IdeaResponse>>> GetIdeas()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var ideas = await _context.Ideas
                    .Include(i => i.IdeaLinks.Where(link => !link.IsDeleted))
                    .Where(i => i.UserId == userId && !i.IsArchived && !i.IsDeleted)
                    .ToListAsync();

                var linkedItemIds = ideas
                    .SelectMany(i => i.IdeaLinks)
                    .Select(link => link.LinkedItemId)
                    .Distinct()
                    .ToList();

                var linkedNotes = await _context.Notes
                    .Where(n => linkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                    .Select(n => new { n.Id, n.Title, Type = "Note" })
                    .ToListAsync();

                var linkedIdeas = await _context.Ideas
                    .Where(i => linkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                    .Select(i => new { i.Id, i.Title, Type = "Idea" })
                    .ToListAsync();

                var linkedTasks = await _context.Tasks
                    .Where(t => linkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                    .Select(t => new { t.Id, t.Title, Type = "Task" })
                    .ToListAsync();

                var linkedReminders = await _context.Reminders
                    .Where(r => linkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                    .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                    .ToListAsync();

                var linkedItemsLookup = linkedNotes
                    .Concat(linkedIdeas)
                    .Concat(linkedTasks)
                    .Concat(linkedReminders)
                    .ToDictionary(item => item.Id, item => new { item.Type, item.Title });

                var responses = ideas.Select(idea => new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = idea.IdeaLinks
                        .Where(link => !link.IsDeleted && linkedItemsLookup.ContainsKey(link.LinkedItemId))
                        .Select(link => new LinkedItemResponse
                        {
                            Id = link.LinkedItemId,
                            Type = linkedItemsLookup[link.LinkedItemId].Type,
                            Title = linkedItemsLookup[link.LinkedItemId].Title
                        })
                        .ToList()
                });

                return Ok(responses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting ideas");
                return StatusCode(500, new { error = "An error occurred while retrieving ideas." });
            }
        }

        [HttpGet("archived")]
        public async Task<ActionResult<IEnumerable<IdeaResponse>>> GetArchivedIdeas()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var ideas = await _context.Ideas
                    .Include(i => i.IdeaLinks.Where(link => !link.IsDeleted))
                    .Where(i => i.UserId == userId && i.IsArchived && !i.IsDeleted)
                    .ToListAsync();
                
                var responses = ideas.Select(idea => new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = idea.IdeaLinks
                        .Where(link => !link.IsDeleted)
                        .Select(link => new LinkedItemResponse { Id = link.LinkedItemId, Type = link.LinkedItemType, Title = "Linked Item" })
                        .ToList()
                });

                return Ok(responses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting archived ideas");
                return StatusCode(500, new { error = "An error occurred while retrieving archived ideas." });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<IdeaResponse>> GetIdea(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var idea = await _context.Ideas
                    .Include(i => i.IdeaLinks.Where(link => !link.IsDeleted))
                    .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId && !i.IsDeleted);

                if (idea == null)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                var linkedItemIds = idea.IdeaLinks
                    .Select(link => link.LinkedItemId)
                    .Distinct()
                    .ToList();

                var linkedNotes = await _context.Notes
                    .Where(n => linkedItemIds.Contains(n.Id) && n.UserId == userId && !n.IsDeleted && !n.IsArchived)
                    .Select(n => new { n.Id, n.Title, Type = "Note" })
                    .ToListAsync();

                var linkedIdeas = await _context.Ideas
                    .Where(i => linkedItemIds.Contains(i.Id) && i.UserId == userId && !i.IsDeleted && !i.IsArchived)
                    .Select(i => new { i.Id, i.Title, Type = "Idea" })
                    .ToListAsync();
                
                var linkedTasks = await _context.Tasks
                    .Where(t => linkedItemIds.Contains(t.Id) && t.UserId == userId && !t.IsDeleted)
                    .Select(t => new { t.Id, t.Title, Type = "Task" })
                    .ToListAsync();

                var linkedReminders = await _context.Reminders
                    .Where(r => linkedItemIds.Contains(r.Id) && r.UserId == userId && !r.IsDeleted)
                    .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                    .ToListAsync();

                var linkedItemsLookup = linkedNotes
                    .Concat(linkedIdeas)
                    .Concat(linkedTasks)
                    .Concat(linkedReminders)
                    .ToDictionary(item => item.Id, item => new { item.Type, item.Title });

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = idea.IdeaLinks
                        .Where(link => !link.IsDeleted && linkedItemsLookup.ContainsKey(link.LinkedItemId))
                        .Select(link => new LinkedItemResponse
                        {
                            Id = link.LinkedItemId,
                            Type = linkedItemsLookup[link.LinkedItemId].Type,
                            Title = linkedItemsLookup[link.LinkedItemId].Title
                        })
                        .ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while retrieving the idea." });
            }
        }

        [HttpPost]
        public async Task<ActionResult<IdeaResponse>> CreateIdea([FromBody] CreateIdeaRequest request)
        {
            try
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
                    IsPinned = request.IsPinned,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };

                _context.Ideas.Add(idea);
                await _context.SaveChangesAsync();

                // Award XP for creating a new idea
                var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(userId, "createidea");

                // Check if any achievements should be unlocked
                var unlockedAchievements = await _achievementService.CheckAndUnlockAchievementsAsync(userId, "createidea");

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.CREATE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Created idea '{idea.Title}'"
                );

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = request.Tags,
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = new List<LinkedItemResponse>()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating idea");
                return StatusCode(500, new { error = "An error occurred while creating the idea." });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<IdeaResponse>> UpdateIdea(string id, [FromBody] UpdateIdeaRequest request)
        {
            try
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
                idea.IsPinned = request.IsPinned;
                idea.IsArchived = request.IsArchived;
                if (request.IsArchived && !idea.ArchivedAt.HasValue)
                {
                    idea.ArchivedAt = DateTime.UtcNow;
                }
                else if (!request.IsArchived)
                {
                    idea.ArchivedAt = null;
                }
                if (request.IsDeleted.HasValue)
                {
                    idea.IsDeleted = request.IsDeleted.Value;
                    idea.DeletedAt = request.IsDeleted.Value ? DateTime.UtcNow : null;
                }
                idea.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log activity for generic update
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.UPDATE.ToString(), // Using UPDATE for generic changes
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Updated idea '{idea.Title}'"
                );

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = request.Tags,
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = new List<LinkedItemResponse>() // We can load links if needed
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while updating the idea." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIdea(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var idea = await _context.Ideas.FindAsync(id);

                if (idea == null || idea.UserId != userId)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                idea.IsDeleted = true;
                idea.DeletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.DELETE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Moved idea '{idea.Title}' to trash"
                );

                return Ok(new { message = "Idea moved to trash successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while deleting the idea." });
            }
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteIdeaPermanently(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var idea = await _context.Ideas.FindAsync(id);

                if (idea == null || idea.UserId != userId)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                // First remove all links
                var ideaLinks = await _context.IdeaLinks
                    .Where(il => il.IdeaId == id)
                    .ToListAsync();
                    
                _context.IdeaLinks.RemoveRange(ideaLinks);
                
                // Then remove the idea itself
                _context.Ideas.Remove(idea);
                await _context.SaveChangesAsync();

                // Log activity before returning OK
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.PERMANENT_DELETE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    id, // Use id here as 'idea' is removed
                    idea.Title, // Can still use idea.Title
                    $"Permanently deleted idea '{idea.Title}'"
                );

                return Ok(new { message = "Idea permanently deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error permanently deleting idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while permanently deleting the idea." });
            }
        }

        [HttpGet("deleted")]
        public async Task<ActionResult<IEnumerable<IdeaResponse>>> GetDeletedIdeas()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var ideas = await _context.Ideas
                    .Include(i => i.IdeaLinks.Where(link => !link.IsDeleted))
                    .Where(i => i.UserId == userId && i.IsDeleted)
                    .ToListAsync();
                
                // Get linked items info for deleted ideas
                var linkedItemIds = ideas
                    .SelectMany(i => i.IdeaLinks)
                    .Select(link => link.LinkedItemId)
                    .Distinct()
                    .ToList();

                var linkedNotes = await _context.Notes
                    .Where(n => linkedItemIds.Contains(n.Id) && n.UserId == userId)
                    .Select(n => new { n.Id, n.Title, Type = "Note" })
                    .ToListAsync();

                var linkedIdeas = await _context.Ideas
                    .Where(i => linkedItemIds.Contains(i.Id) && i.UserId == userId)
                    .Select(i => new { i.Id, i.Title, Type = "Idea" })
                    .ToListAsync();
                
                var linkedTasks = await _context.Tasks
                    .Where(t => linkedItemIds.Contains(t.Id) && t.UserId == userId)
                    .Select(t => new { t.Id, t.Title, Type = "Task" })
                    .ToListAsync();

                var linkedReminders = await _context.Reminders
                    .Where(r => linkedItemIds.Contains(r.Id) && r.UserId == userId)
                    .Select(r => new { r.Id, r.Title, Type = "Reminder" })
                    .ToListAsync();

                var linkedItemsLookup = linkedNotes
                    .Concat(linkedIdeas)
                    .Concat(linkedTasks)
                    .Concat(linkedReminders)
                    .ToDictionary(item => item.Id, item => new { item.Type, item.Title });

                var responses = ideas.Select(idea => new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsPinned = idea.IsPinned,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    IsDeleted = idea.IsDeleted,
                    DeletedAt = idea.DeletedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = idea.IdeaLinks
                        .Where(link => !link.IsDeleted && linkedItemsLookup.ContainsKey(link.LinkedItemId))
                        .Select(link => new LinkedItemResponse
                        {
                            Id = link.LinkedItemId,
                            Type = linkedItemsLookup[link.LinkedItemId].Type,
                            Title = linkedItemsLookup[link.LinkedItemId].Title
                        })
                        .ToList()
                });

                return Ok(responses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting deleted ideas");
                return StatusCode(500, new { error = "An error occurred while retrieving deleted ideas." });
            }
        }

        [HttpPut("{id}/restore")]
        public async Task<ActionResult<IdeaResponse>> RestoreIdea(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var idea = await _context.Ideas.FindAsync(id);

                if (idea == null || idea.UserId != userId)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                if (!idea.IsDeleted)
                {
                    return BadRequest(new { error = "The idea is not in trash." });
                }

                idea.IsDeleted = false;
                idea.DeletedAt = null;
                idea.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.RESTORE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Restored idea '{idea.Title}' from trash"
                );

                return await GetIdea(id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while restoring the idea." });
            }
        }

        [HttpPut("{id}/favorite")]
        public async Task<ActionResult<IdeaResponse>> ToggleFavorite(string id)
        {
            try
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

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    idea.IsFavorite ? ActivityActionType.FAVORITE.ToString() : ActivityActionType.UNFAVORITE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    idea.IsFavorite ? $"Marked idea '{idea.Title}' as favorite" : $"Removed idea '{idea.Title}' from favorites"
                );

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = new List<LinkedItemResponse>() // We can load links if needed
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling favorite for idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while toggling favorite." });
            }
        }

        [HttpPut("{id}/pin")]
        public async Task<ActionResult<IdeaResponse>> TogglePin(string id)
        {
            try
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

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    idea.IsPinned ? ActivityActionType.PIN.ToString() : ActivityActionType.UNPIN.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    idea.IsPinned ? $"Pinned idea '{idea.Title}'" : $"Unpinned idea '{idea.Title}'"
                );

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = new List<LinkedItemResponse>() // We can load links if needed
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling pin for idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while toggling pin." });
            }
        }

        [HttpPut("{id}/archive")]
        public async Task<ActionResult<IdeaResponse>> ToggleArchive(string id)
        {
            try
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

                // Log activity
                await _activityLogger.LogActivityAsync(
                    userId,
                    idea.IsArchived ? ActivityActionType.ARCHIVE.ToString() : ActivityActionType.UNARCHIVE.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    idea.IsArchived ? $"Archived idea '{idea.Title}'" : $"Unarchived idea '{idea.Title}'"
                );

                var response = new IdeaResponse
                {
                    Id = idea.Id,
                    Title = idea.Title,
                    Content = idea.Content,
                    Tags = string.IsNullOrEmpty(idea.Tags) ? new List<string>() : idea.Tags.Split(',').ToList(),
                    IsFavorite = idea.IsFavorite,
                    IsArchived = idea.IsArchived,
                    ArchivedAt = idea.ArchivedAt,
                    CreatedAt = idea.CreatedAt,
                    UpdatedAt = idea.UpdatedAt,
                    LinkedItems = new List<LinkedItemResponse>() // We can load links if needed
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling archive for idea {IdeaId}", id);
                return StatusCode(500, new { error = "An error occurred while toggling archive." });
            }
        }

        [HttpPost("{ideaId}/links")]
        public async Task<ActionResult<IdeaResponse>> AddLink(string ideaId, [FromBody] SecondBrain.Api.DTOs.Ideas.AddLinkRequest request)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var idea = await _context.Ideas
                    .Include(i => i.IdeaLinks.Where(l => !l.IsDeleted))
                    .FirstOrDefaultAsync(i => i.Id == ideaId && i.UserId == userId && !i.IsDeleted && !i.IsArchived);

                if (idea == null)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                // Validate target item based on type
                bool targetExists = false;
                string targetItemUserId = string.Empty; // Initialize with empty string instead of null

                switch (request.LinkedItemType)
                {
                    case "Note":
                        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == request.LinkedItemId && !n.IsDeleted && !n.IsArchived);
                        if (note != null) {
                            targetExists = true;
                            targetItemUserId = note.UserId;
                        }
                        break;
                    case "Idea":
                        var linkedIdeaEntity = await _context.Ideas.FirstOrDefaultAsync(i => i.Id == request.LinkedItemId && !i.IsDeleted && !i.IsArchived);
                         if (linkedIdeaEntity != null) {
                            targetExists = true;
                            targetItemUserId = linkedIdeaEntity.UserId;
                        }
                        break;
                    case "Task":
                        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == request.LinkedItemId && !t.IsDeleted);
                        if (task != null) {
                            targetExists = true;
                            targetItemUserId = task.UserId;
                        }
                        break;
                    case "Reminder":
                         var reminder = await _context.Reminders.FirstOrDefaultAsync(r => r.Id == request.LinkedItemId && !r.IsDeleted);
                        if (reminder != null) {
                            targetExists = true;
                            targetItemUserId = reminder.UserId;
                        }
                        break;
                    default:
                        return BadRequest(new { error = "Invalid linked item type." });
                }

                if (!targetExists)
                {
                    return NotFound(new { error = $"Linked {request.LinkedItemType.ToLower()} with ID '{request.LinkedItemId}' not found, or it is deleted/archived." });
                }

                if (targetItemUserId != userId)
                {
                    return NotFound(new { error = $"Access to linked {request.LinkedItemType.ToLower()} denied or item not found." });
                }

                // Check if link already exists (active links only)
                if (idea.IdeaLinks.Any(il => il.LinkedItemId == request.LinkedItemId && il.LinkedItemType == request.LinkedItemType && !il.IsDeleted))
                {
                    return BadRequest(new { error = "Link already exists." });
                }
                
                // Check for an existing soft-deleted link
                var existingSoftDeletedLink = await _context.IdeaLinks
                    .FirstOrDefaultAsync(il => il.IdeaId == ideaId && il.LinkedItemId == request.LinkedItemId && il.LinkedItemType == request.LinkedItemType && il.IsDeleted);

                if (existingSoftDeletedLink != null)
                {
                    existingSoftDeletedLink.IsDeleted = false;
                    existingSoftDeletedLink.CreatedAt = DateTime.UtcNow;
                }
                else
                {
                    var ideaLink = new IdeaLink
                    {
                        IdeaId = ideaId,
                        LinkedItemId = request.LinkedItemId,
                        LinkedItemType = request.LinkedItemType,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.IdeaLinks.Add(ideaLink);
                }

                await _context.SaveChangesAsync();

                // Log activity
                // Need to fetch the target item title for a better description
                string targetItemTitle = "Linked Item"; // Default
                switch(request.LinkedItemType)
                {
                    case "Note":
                        var linkedNote = await _context.Notes.FindAsync(request.LinkedItemId);
                        if (linkedNote != null) targetItemTitle = linkedNote.Title;
                        break;
                    case "Idea":
                        var linkedIdea = await _context.Ideas.FindAsync(request.LinkedItemId);
                        if (linkedIdea != null) targetItemTitle = linkedIdea.Title;
                        break;
                    case "Task":
                        var linkedTask = await _context.Tasks.FindAsync(request.LinkedItemId);
                        if (linkedTask != null) targetItemTitle = linkedTask.Title;
                        break;
                    case "Reminder":
                        var linkedReminder = await _context.Reminders.FindAsync(request.LinkedItemId);
                        if (linkedReminder != null) targetItemTitle = linkedReminder.Title;
                        break;
                }
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.LINK.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Linked idea '{idea.Title}' to {request.LinkedItemType} '{targetItemTitle}'"
                );

                return await GetIdea(ideaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding link to idea {IdeaId}", ideaId);
                return StatusCode(500, new { error = "An error occurred while adding the link." });
            }
        }

        [HttpDelete("{ideaId}/links/{linkedItemId}/{linkedItemType}")]
        public async Task<ActionResult<IdeaResponse>> RemoveLink(string ideaId, string linkedItemId, string linkedItemType)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var idea = await _context.Ideas
                    .FirstOrDefaultAsync(i => i.Id == ideaId && i.UserId == userId && !i.IsDeleted);

                if (idea == null)
                {
                    return NotFound(new { error = IdeaNotFoundError });
                }

                var ideaLink = await _context.IdeaLinks
                    .FirstOrDefaultAsync(il => il.IdeaId == ideaId && il.LinkedItemId == linkedItemId && il.LinkedItemType == linkedItemType && !il.IsDeleted);
                
                if (ideaLink == null)
                {
                    return NotFound(new { error = "Link not found." });
                }

                // Soft delete the link
                ideaLink.IsDeleted = true;

                await _context.SaveChangesAsync();

                // Log activity
                // Need to fetch the target item title for a better description
                string targetItemTitle = "Linked Item"; // Default
                switch(linkedItemType)
                {
                    case "Note":
                        var linkedNote = await _context.Notes.FindAsync(linkedItemId);
                        if (linkedNote != null) targetItemTitle = linkedNote.Title;
                        break;
                    case "Idea":
                        var linkedIdea = await _context.Ideas.FindAsync(linkedItemId);
                        if (linkedIdea != null) targetItemTitle = linkedIdea.Title;
                        break;
                    case "Task":
                        var linkedTask = await _context.Tasks.FindAsync(linkedItemId);
                        if (linkedTask != null) targetItemTitle = linkedTask.Title;
                        break;
                    case "Reminder":
                        var linkedReminder = await _context.Reminders.FindAsync(linkedItemId);
                        if (linkedReminder != null) targetItemTitle = linkedReminder.Title;
                        break;
                }
                await _activityLogger.LogActivityAsync(
                    userId,
                    ActivityActionType.UNLINK.ToString(),
                    ActivityItemType.IDEA.ToString(),
                    idea.Id,
                    idea.Title,
                    $"Unlinked idea '{idea.Title}' from {linkedItemType} '{targetItemTitle}'"
                );

                return await GetIdea(ideaId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing link from idea {IdeaId}", ideaId);
                return StatusCode(500, new { error = "An error occurred while removing the link." });
            }
        }
    }
}