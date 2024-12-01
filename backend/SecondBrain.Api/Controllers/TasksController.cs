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

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly DataContext _context;

        public TasksController(DataContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponse>>> GetTasks()
        {
            var userId = User.GetUserId();
            var tasks = await _context.Tasks
                .Include(t => t.TaskLinks)
                    .ThenInclude(tl => tl.LinkedItem)
                .Where(t => t.UserId == userId && !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return Ok(tasks.Select(TaskResponse.FromEntity));
        }

        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedTasks()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var deletedTasks = await _context.Tasks
                .Where(t => t.UserId == userId && t.IsDeleted)
                .ToListAsync();

            var response = deletedTasks.Select(TaskResponse.FromEntity);
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

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

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, response);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponse>> GetTask(string id)
        {
            var userId = User.GetUserId();
            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                    .ThenInclude(tl => tl.LinkedItem)
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (task == null)
                return NotFound();

            return Ok(TaskResponse.FromEntity(task));
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateTask(string id, [FromBody] UpdateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = "Task not found." });
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
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = "Task not found." });
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
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId && t.IsDeleted)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = "Task not found." });
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
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = "Task not found." });
            }

            // Permanently remove the task
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
            var task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            if (task == null)
                return NotFound();

            var linkedItem = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == request.LinkedItemId && n.UserId == userId);

            if (linkedItem == null)
                return NotFound("Linked item not found");

            var taskLink = new TaskLink
            {
                TaskId = taskId,
                LinkedItemId = request.LinkedItemId,
                LinkType = request.LinkType,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };

            _context.TaskLinks.Add(taskLink);
            await _context.SaveChangesAsync();

            task = await _context.Tasks
                .Include(t => t.TaskLinks)
                .ThenInclude(tl => tl.LinkedItem)
                .FirstAsync(t => t.Id == taskId);

            return Ok(TaskResponse.FromEntity(task));
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
