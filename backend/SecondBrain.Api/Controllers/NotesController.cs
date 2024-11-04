using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Notes;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotesController : ControllerBase
    {
        private readonly DataContext _context;

        public NotesController(DataContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var notes = await _context.Notes
                .Include(n => n.NoteLinks)
                .Where(n => n.UserId == userId && !n.IsDeleted)
                .ToListAsync();

            var response = notes.Select(NoteResponse.FromEntity);
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = new Note
            {
                Id = Guid.NewGuid().ToString(),
                Title = request.Title,
                Content = request.Content,
                Tags = string.Join(",", request.Tags ?? new List<string>()),
                IsPinned = request.IsPinned,
                IsFavorite = request.IsFavorite,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = userId
            };

            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            var response = new NoteResponse
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                Tags = !string.IsNullOrEmpty(note.Tags) 
                    ? note.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() 
                    : new List<string>(),
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                IsArchived = note.IsArchived,
                ArchivedAt = note.ArchivedAt,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
                LinkedNoteIds = new List<string>()
            };

            return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetNoteById(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .Include(n => n.TaskItemNotes)
                    .ThenInclude(tn => tn.TaskItem)
                .Include(n => n.NoteLinks)
                    .ThenInclude(nl => nl.LinkedNote)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            var linkedNoteIds = note.NoteLinks.Select(nl => nl.LinkedNoteId).ToList();

            var response = new NoteResponse
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                IsArchived = note.IsArchived,
                ArchivedAt = note.ArchivedAt,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
                LinkedNoteIds = linkedNoteIds,
                Tags = !string.IsNullOrEmpty(note.Tags)
                    ? note.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    : new List<string>()
            };

            return Ok(response);
        }

        [HttpDelete("{id}/links/{targetNoteId}")]
        public async Task<IActionResult> RemoveLink(string id, string targetNoteId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var links = await _context.NoteLinks
                .Where(nl => (nl.NoteId == id && nl.LinkedNoteId == targetNoteId) ||
                             (nl.NoteId == targetNoteId && nl.LinkedNoteId == id))
                .ToListAsync();

            if (!links.Any())
            {
                return NotFound(new { error = "Link not found." });
            }

            _context.NoteLinks.RemoveRange(links);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notes unlinked successfully." });
        }

        [HttpPost("{id}/links")]
        public async Task<IActionResult> AddLink(string id, [FromBody] AddLinkRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var sourceNote = await _context.Notes.FindAsync(id);
            var targetNote = await _context.Notes.FindAsync(request.TargetNoteId);

            if (sourceNote == null || targetNote == null || sourceNote.UserId != userId || targetNote.UserId != userId)
            {
                return NotFound(new { error = "Note not found." });
            }

            // Check if either note is deleted
            if (_context.Entry(sourceNote).State == EntityState.Deleted || _context.Entry(targetNote).State == EntityState.Deleted)
            {
                return BadRequest(new { error = "Cannot link to a deleted note." });
            }

            // Check if link already exists
            var existingLink = await _context.NoteLinks
                .AnyAsync(nl => 
                    (nl.NoteId == id && nl.LinkedNoteId == request.TargetNoteId) ||
                    (nl.NoteId == request.TargetNoteId && nl.LinkedNoteId == id));

            if (existingLink)
            {
                return BadRequest(new { error = "Notes are already linked." });
            }

            // Create link in both directions
            var noteLink = new NoteLink { NoteId = id, LinkedNoteId = request.TargetNoteId };
            var reverseLink = new NoteLink { NoteId = request.TargetNoteId, LinkedNoteId = id };

            _context.NoteLinks.AddRange(noteLink, reverseLink);
            await _context.SaveChangesAsync();

            // Return updated note with links
            var updatedNote = await _context.Notes
                .Include(n => n.NoteLinks)
                .Where(n => n.Id == id)
                .Select(n => new NoteResponse
                {
                    Id = n.Id,
                    Title = n.Title,
                    Content = n.Content,
                    Tags = (n.Tags ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                    IsPinned = n.IsPinned,
                    IsFavorite = n.IsFavorite,
                    IsArchived = n.IsArchived,
                    ArchivedAt = n.ArchivedAt,
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt,
                    LinkedNoteIds = n.NoteLinks
                        .Where(nl => !nl.IsDeleted)
                        .Select(nl => nl.LinkedNoteId)
                        .ToList()
                })
                .FirstOrDefaultAsync();

            return Ok(updatedNote);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            note.IsDeleted = true;
            note.DeletedAt = DateTime.UtcNow;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("deleted")]
        public async Task<IActionResult> GetDeletedNotes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var deletedNotes = await _context.Notes
                .Where(n => n.UserId == userId && n.IsDeleted)
                .ToListAsync();

            var response = deletedNotes.Select(NoteResponse.FromEntity);
            return Ok(response);
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId && n.IsDeleted)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            note.IsDeleted = false;
            note.DeletedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(NoteResponse.FromEntity(note));
        }

        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> DeleteNotePermanently(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(string id, [FromBody] UpdateNoteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            // Update properties if provided
            if (request.Title != null) note.Title = request.Title;
            if (request.Content != null) note.Content = request.Content;
            if (request.Tags != null) note.Tags = string.Join(",", request.Tags);
            if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
            if (request.IsFavorite.HasValue) note.IsFavorite = request.IsFavorite.Value;
            if (request.IsArchived.HasValue) note.IsArchived = request.IsArchived.Value;
            if (request.IsDeleted.HasValue) 
            {
                note.IsDeleted = request.IsDeleted.Value;
                note.DeletedAt = request.IsDeleted.Value ? DateTime.UtcNow : null;
            }

            note.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(NoteResponse.FromEntity(note));
        }

        [HttpGet("archived")]
        public async Task<IActionResult> GetArchivedNotes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            // Add logging to check the userId and query
            Console.WriteLine($"Fetching archived notes for user: {userId}");

            // First, let's check if we can find any archived notes
            var archivedCount = await _context.Notes
                .Where(n => n.UserId == userId && n.IsArchived)
                .CountAsync();

            Console.WriteLine($"Found {archivedCount} archived notes");

            // Get the archived notes with more detailed logging
            var archivedNotes = await _context.Notes
                .Where(n => n.UserId == userId && n.IsArchived)
                .Include(n => n.NoteLinks)
                .AsNoTracking() // Add this to improve performance for read-only operations
                .ToListAsync();

            Console.WriteLine($"Retrieved {archivedNotes.Count} notes with their links");

            // Map to response
            var response = archivedNotes.Select(n => new NoteResponse
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                Tags = !string.IsNullOrEmpty(n.Tags) 
                    ? n.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() 
                    : new List<string>(),
                IsPinned = n.IsPinned,
                IsFavorite = n.IsFavorite,
                IsArchived = n.IsArchived,
                ArchivedAt = n.ArchivedAt,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt,
                LinkedNoteIds = n.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList()
            }).ToList();

            Console.WriteLine($"Mapped {response.Count} notes to response");

            return Ok(response);
        }

        [HttpPost("{id}/unarchive")]
        public async Task<IActionResult> UnarchiveNote(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId && n.IsArchived)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            note.IsArchived = false;
            note.ArchivedAt = null;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(NoteResponse.FromEntity(note));
        }

    }
}
