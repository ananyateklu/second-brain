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
                .Where(t => t.UserId == userId)
                .Include(t => t.TaskItemNotes)
                .ThenInclude(tn => tn.Note)
                .ToListAsync();
            return Ok(tasks);
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
                UserId = userId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, task);
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

            return Ok(task);
        }

        // Additional CRUD actions (Update, Delete)...
    }
}
