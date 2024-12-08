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

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ApiControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<TasksController> _logger;
        private const string TASK_NOT_FOUND_ERROR = "Task not found.";
        private const string USER_ID_NOT_FOUND_ERROR = "User ID not found in token.";

        public TasksController(DataContext context, ILogger<TasksController> logger)
        {
            _context = context;
            _logger = logger;
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

            // First remove all task links
            if (task.TaskLinks != null && task.TaskLinks.Any())
            {
                _context.TaskLinks.RemoveRange(task.TaskLinks);
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
            _logger.LogInformation("Adding task link. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, UserId: {UserId}", taskId, request.LinkedItemId, userId);

            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            if (task == null)
            {
                _logger.LogWarning("Task not found. TaskId: {TaskId}, UserId: {UserId}", taskId, userId);
                return NotFound();
            }

            var linkedItem = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == request.LinkedItemId && n.UserId == userId);

            if (linkedItem == null)
            {
                _logger.LogWarning("Linked item not found. LinkedItemId: {LinkedItemId}, UserId: {UserId}", request.LinkedItemId, userId);
                return NotFound("Linked item not found");
            }

            // Check if link already exists (including soft-deleted ones)
            var existingLink = await _context.TaskLinks
                .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.LinkedItemId == request.LinkedItemId);

            if (existingLink != null)
            {
                if (!existingLink.IsDeleted)
                {
                    _logger.LogWarning("Task link already exists and is active. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}", taskId, request.LinkedItemId);
                    return BadRequest("Task is already linked to this item");
                }

                // Reactivate the soft-deleted link
                existingLink.IsDeleted = false;
                existingLink.DeletedAt = null;
                existingLink.Description = request.Description; // Update description if provided
                existingLink.CreatedAt = DateTime.UtcNow;      // Update creation time

                _logger.LogInformation("Reactivating existing task link: {@TaskLink}", existingLink);
            }
            else
            {
                // Create new link if no existing link found
                var taskLink = new TaskLink
                {
                    TaskId = taskId,
                    LinkedItemId = request.LinkedItemId,
                    LinkType = request.LinkType,
                    Description = request.Description,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId,
                    IsDeleted = false,
                    DeletedAt = null
                };

                _logger.LogInformation("Creating new task link: {@TaskLink}", taskLink);
                _context.TaskLinks.Add(taskLink);
            }

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Task link saved successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving task link");
                return StatusCode(500, new { error = "Failed to save task link" });
            }

            // Reload the task with its links
            try
            {
                task = await _context.Tasks
                    .Include(t => t.TaskLinks.Where(tl => !tl.IsDeleted))
                        .ThenInclude(tl => tl.LinkedItem)
                    .FirstAsync(t => t.Id == taskId);

                // Log the task links for debugging
                _logger.LogInformation("Task links after save: {@TaskLinks}", task.TaskLinks.Select(tl => new { tl.TaskId, tl.LinkedItemId, tl.IsDeleted }));

                var response = TaskResponse.FromEntity(task);
                _logger.LogInformation("Task link created successfully. TaskId: {TaskId}, LinkedItemId: {LinkedItemId}, Response: {@Response}", taskId, request.LinkedItemId, response);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading task after saving link");
                return StatusCode(500, new { error = "Failed to load task after saving link" });
            }
        }

        [HttpDelete("{taskId}/links/{linkedItemId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveTaskLink(string taskId, string linkedItemId)
        {
            var userId = User.GetUserId();
            var taskLink = await _context.TaskLinks
                .FirstOrDefaultAsync(tl =>
                    tl.TaskId == taskId &&
                    tl.LinkedItemId == linkedItemId &&
                    tl.Task.UserId == userId);

            if (taskLink == null)
                return NotFound();

            taskLink.IsDeleted = true;
            taskLink.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .ThenInclude(tl => tl.LinkedItem)
                .FirstAsync(t => t.Id == taskId);

            return Ok(TaskResponse.FromEntity(task));
        }
    }
}
