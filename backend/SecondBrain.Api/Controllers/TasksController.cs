using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Tasks;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using SecondBrain.Api.Extensions;
using Microsoft.Extensions.Logging;
using SecondBrain.Api.Gamification;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ApiControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<TasksController> _logger;
        private readonly IXPService _xpService;
        private const string TASK_NOT_FOUND_ERROR = "Task not found.";
        private const string USER_ID_NOT_FOUND_ERROR = "User ID not found in token.";

        public TasksController(DataContext context, ILogger<TasksController> logger, IXPService xpService)
        {
            _context = context;
            _logger = logger;
            _xpService = xpService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponse>>> GetTasks()
        {
            var userId = GetUserId();
            _logger.LogInformation("Getting tasks for user {UserId}", userId);

            var tasks = await _context.Tasks
                .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.LinkedItem)
                .Where(t => t.UserId == userId && !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} tasks for user {UserId}", tasks.Count, userId);
            return Ok(tasks.Select(TaskResponse.FromEntity));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponse>> GetTaskById(string id)
        {
            var userId = GetUserId();
            var task = await _context.Tasks
                .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.LinkedItem)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (task == null)
                return NotFound();

            return Ok(TaskResponse.FromEntity(task));
        }

        [HttpPost]
        public async Task<ActionResult<TaskResponse>> CreateTask([FromBody] CreateTaskRequest request)
        {
            var userId = GetUserId();
            var task = new TaskItem
            {
                Id = Guid.NewGuid().ToString(),
                Title = request.Title,
                Description = request.Description,
                Status = Data.Entities.TaskStatus.Incomplete,
                Priority = (Data.Entities.TaskPriority)request.Priority,
                DueDate = request.DueDate,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = userId,
                Tags = string.Join(",", request.Tags ?? Enumerable.Empty<string>())
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Award XP for creating a task
            await _xpService.AwardXPAsync(userId, "createtask", null, task.Id, task.Title);

            var response = TaskResponse.FromEntity(task);
            return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, response);
        }

        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedTasks()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var deletedTasks = await _context.Tasks
                .IgnoreQueryFilters()
                .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.LinkedItem)
                .Where(t => t.UserId == userId && t.IsDeleted)
                .ToListAsync();

            var response = deletedTasks.Select(TaskResponse.FromEntity);
            return Ok(response);
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = TASK_NOT_FOUND_ERROR });
            }

            // Check if the task is being completed
            bool wasCompleted = task.Status == Data.Entities.TaskStatus.Completed;

            // Update fields if they are provided
            if (!string.IsNullOrEmpty(request.Title))
                task.Title = request.Title;

            if (!string.IsNullOrEmpty(request.Description))
                task.Description = request.Description;

            if (request.Priority.HasValue)
                task.Priority = (Data.Entities.TaskPriority)request.Priority.Value;

            if (request.DueDate.HasValue)
                task.DueDate = request.DueDate;

            if (request.Status.HasValue)
                task.Status = (Data.Entities.TaskStatus)request.Status.Value;

            if (request.Tags != null)
                task.Tags = string.Join(",", request.Tags);

            // Add handling for isDeleted and deletedAt
            if (request.IsDeleted.HasValue)
            {
                task.IsDeleted = request.IsDeleted.Value;
                task.DeletedAt = request.IsDeleted.Value ? DateTime.UtcNow : null;
            }

            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Check if the task has been completed now but wasn't before
            if (request.Status.HasValue && 
                (Data.Entities.TaskStatus)request.Status.Value == Data.Entities.TaskStatus.Completed && 
                !wasCompleted)
            {
                // Award XP for completing a task
                await _xpService.AwardXPAsync(userId, "completetask", null, task.Id, task.Title);
            }

            var response = TaskResponse.FromEntity(task);
            return Ok(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = TASK_NOT_FOUND_ERROR });
            }

            task.IsDeleted = true;
            task.DeletedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreTask(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId && t.IsDeleted)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = TASK_NOT_FOUND_ERROR });
            }

            task.IsDeleted = false;
            task.DeletedAt = null;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = TaskResponse.FromEntity(task);
            return Ok(response);
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteTaskPermanently(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = USER_ID_NOT_FOUND_ERROR });
            }

            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = TASK_NOT_FOUND_ERROR });
            }

            // First soft-delete all task links instead of removing them
            if (task.TaskLinks != null && task.TaskLinks.Any())
            {
                foreach (var link in task.TaskLinks)
                {
                    link.IsDeleted = true;
                    link.DeletedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
            }

            // Then remove the task
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{taskId}/links")]
        [ProducesResponseType(typeof(TaskResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddTaskLink(string taskId, [FromBody] TaskLinkRequest request)
        {
            var userId = User.GetUserId();
            _logger.LogInformation("Adding task link. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, LinkType: {LinkType}, UserId: {UserId}", taskId, request.LinkedItemId, request.LinkType, userId);

            var (task, linkedItem) = await GetTaskAndLinkedItem(taskId, request.LinkedItemId, userId, request.LinkType);
            if (task == null) return NotFound();
            if (linkedItem == null) return NotFound("Linked item not found");

            // Use IgnoreQueryFilters to find soft-deleted links that can be reactivated
            var existingLink = await _context.TaskLinks
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.LinkedItemId == request.LinkedItemId);

            if (existingLink != null)
            {
                if (!existingLink.IsDeleted) return BadRequest("Task is already linked to this item");
                await ReactivateLink(existingLink, request.LinkType, request.Description);
            }
            else
            {
                await CreateNewLink(task, request.LinkedItemId, request.LinkType, userId, request.Description);
            }

            return await GetUpdatedTaskResponse(taskId);
        }

        private async Task<(TaskItem? task, object? linkedItem)> GetTaskAndLinkedItem(string taskId, string linkedItemId, string userId, string linkType)
        {
            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            object? linkedItem = null;
            if (linkType == "note")
            {
                linkedItem = await _context.Notes
                    .FirstOrDefaultAsync(n => n.Id == linkedItemId && n.UserId == userId);
            }
            else if (linkType == "idea")
            {
                linkedItem = await _context.Ideas
                    .FirstOrDefaultAsync(i => i.Id == linkedItemId && i.UserId == userId);
            }

            return (task, linkedItem);
        }

        private async Task ReactivateLink(TaskLink link, string linkType, string? description)
        {
            link.IsDeleted = false;
            link.DeletedAt = null;
            link.Description = description;
            link.CreatedAt = DateTime.UtcNow;
            link.LinkType = linkType;
            await _context.SaveChangesAsync();
        }

        private async Task CreateNewLink(TaskItem task, string linkedItemId, string linkType, string userId, string? description)
        {
            var taskLink = new TaskLink
            {
                TaskId = task.Id,
                LinkedItemId = linkedItemId,
                LinkType = linkType,
                Description = description,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                IsDeleted = false,
                DeletedAt = null
            };

            _context.TaskLinks.Add(taskLink);
            await _context.SaveChangesAsync();
        }

        private async Task<IActionResult> GetUpdatedTaskResponse(string taskId)
        {
            var task = await _context.Tasks
                .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                    .ThenInclude(tl => tl.LinkedItem)
                .FirstAsync(t => t.Id == taskId);

            var response = TaskResponse.FromEntity(task);
            return Ok(response);
        }

        [HttpDelete("{taskId}/links/{linkedItemId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveTaskLink(string taskId, string linkedItemId)
        {
            var userId = User.GetUserId();
            
            // Find the task link first to check if it exists and get the link type
            // Use IgnoreQueryFilters to ensure we can find links even if they're soft-deleted
            var link = await _context.TaskLinks
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(tl =>
                    tl.TaskId == taskId &&
                    tl.LinkedItemId == linkedItemId &&
                    tl.Task.UserId == userId);

            if (link == null)
            {
                _logger.LogWarning("Task link not found. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, UserId: {UserId}", taskId, linkedItemId, userId);
                return NotFound();
            }

            // If the link is already soft-deleted, consider it a no-op or return appropriate response
            if (link.IsDeleted)
            {
                _logger.LogInformation("Task link already deleted. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, UserId: {UserId}", taskId, linkedItemId, userId);
                return NoContent(); // or return success as it's already in the desired state
            }

            // Store link type for removing corresponding link
            var linkType = link.LinkType;
            
            // Soft delete the task link
            link.IsDeleted = true;
            link.DeletedAt = DateTime.UtcNow;
            
            _logger.LogInformation("Soft deleted task link. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, LinkType: {LinkType}, UserId: {UserId}", taskId, linkedItemId, linkType, userId);

            // Remove the corresponding link from the linked item
            switch (linkType)
            {
                case "note":
                    var noteLink = await _context.NoteLinks.FirstOrDefaultAsync(nl =>
                        nl.NoteId == linkedItemId &&
                        nl.LinkedItemId == taskId &&
                        nl.LinkType == "task" &&
                        !nl.IsDeleted);
                    
                    if (noteLink != null)
                    {
                        noteLink.IsDeleted = true;
                        noteLink.DeletedAt = DateTime.UtcNow;
                        _logger.LogInformation("Soft deleted corresponding link from Note {LinkedItemId} to Task {TaskId}", linkedItemId, taskId);
                    }
                    break;
                    
                case "idea":
                    var ideaLink = await _context.IdeaLinks.FirstOrDefaultAsync(il =>
                        il.IdeaId == linkedItemId &&
                        il.LinkedItemId == taskId &&
                        il.LinkedItemType == "Task" &&
                        !il.IsDeleted);
                    
                    if (ideaLink != null)
                    {
                        ideaLink.IsDeleted = true;
                        _logger.LogInformation("Soft deleted corresponding link from Idea {LinkedItemId} to Task {TaskId}", linkedItemId, taskId);
                    }
                    break;
            }

            await _context.SaveChangesAsync();

            var task = await _context.Tasks
                .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                .ThenInclude(tl => tl.LinkedItem)
                .FirstAsync(t => t.Id == taskId);

            return Ok(TaskResponse.FromEntity(task));
        }
    }
}
