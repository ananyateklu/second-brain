using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Tasks;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;

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
        public async Task<IActionResult> GetAllTasks()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var tasks = await _context.Tasks
                .Where(t => t.UserId == userId && !t.IsDeleted)
                .ToListAsync();

            var response = tasks.Select(TaskResponse.FromEntity);
            return Ok(response);
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

            return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(string id)
        {
            // Retrieve userId using ClaimTypes.NameIdentifier
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Optional: Check if userId is null or empty
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var task = await _context.Tasks
                .Where(t => t.Id == id && t.UserId == userId)
                .Include(t => t.TaskItemNotes)
                .ThenInclude(tn => tn.Note)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { error = "Task not found." });
            }

            var response = TaskResponse.FromEntity(task);

            return Ok(task);
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
    }
}
