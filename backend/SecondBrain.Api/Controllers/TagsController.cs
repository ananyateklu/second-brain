using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TagsController : ControllerBase
    {
        private readonly DataContext _context;

        public TagsController(DataContext context)
        {
            _context = context;
        }

        // GET: api/Tags
        [HttpGet]
        public async Task<IActionResult> GetAllTags()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var tags = await _context.Tags
                .Where(t => t.NoteTags.Any(nt => nt.Note.UserId == userId)
                            || t.ReminderTags.Any(rt => rt.Reminder.UserId == userId)
                            || t.TaskItemTags.Any(tt => tt.TaskItem.UserId == userId))
                .ToListAsync();
            return Ok(tags);
        }

        // GET: api/Tags/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTag(string id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();

            return Ok(tag);
        }

        // POST: api/Tags
        [HttpPost]
        public async Task<IActionResult> CreateTag([FromBody] Tag tag)
        {
            tag.Id = Guid.NewGuid().ToString();
            _context.Tags.Add(tag);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTag), new { id = tag.Id }, tag);
        }

        // PUT: api/Tags/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTag(string id, [FromBody] Tag updatedTag)
        {
            if (id != updatedTag.Id)
                return BadRequest();

            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();

            tag.Name = updatedTag.Name;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Tags/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTag(string id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound();

            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Tags/withCounts
        [HttpGet("withCounts")]
        public async Task<IActionResult> GetAllTagsWithCounts()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var tags = await _context.Tags
                .Select(tag => new
                {
                    tag.Id,
                    tag.Name,
                    NoteCount = tag.NoteTags.Count(nt => nt.Note.UserId == userId),
                    ReminderCount = tag.ReminderTags.Count(rt => rt.Reminder.UserId == userId),
                    TaskCount = tag.TaskItemTags.Count(tt => tt.TaskItem.UserId == userId),
                })
                .ToListAsync();

            var result = tags.Select(t => new
            {
                t.Id,
                t.Name,
                TotalCount = t.NoteCount + t.ReminderCount + t.TaskCount
            });

            return Ok(result);
        }

        // GET: api/Tags/{id}/details
        [HttpGet("{id}/details")]
        public async Task<IActionResult> GetTagDetails(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var tag = await _context.Tags
                .Where(t => t.Id == id)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    Notes = t.NoteTags
                        .Where(nt => nt.Note.UserId == userId)
                        .Select(nt => new { nt.Note.Id, nt.Note.Title, nt.Note.Content })
                        .ToList(),
                    Reminders = t.ReminderTags
                        .Where(rt => rt.Reminder.UserId == userId)
                        .Select(rt => new { rt.Reminder.Id, rt.Reminder.Description })
                        .ToList(),
                    Tasks = t.TaskItemTags
                        .Where(tt => tt.TaskItem.UserId == userId)
                        .Select(tt => new { tt.TaskItem.Id, tt.TaskItem.Title })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (tag == null)
                return NotFound();

            return Ok(tag);
        }
    }
}
