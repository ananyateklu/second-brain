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
        public async Task<IActionResult> GetAllNotes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var notes = await _context.Notes
                .Where(n => n.UserId == userId)
                .Include(n => n.TaskItemNotes)
                .ThenInclude(tn => tn.TaskItem)
                .ToListAsync();
            return Ok(notes);
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
                IsPinned = request.IsPinned,
                IsFavorite = request.IsFavorite,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                UserId = userId
            };

            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, note);
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
                LinkedNoteIds = linkedNoteIds
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
                .FirstOrDefaultAsync(nl => nl.NoteId == id && nl.LinkedNoteId == request.TargetNoteId);

            if (existingLink != null)
            {
                return BadRequest(new { error = "Notes are already linked." });
            }

            // Create link in both directions
            var noteLink = new NoteLink { NoteId = id, LinkedNoteId = request.TargetNoteId };
            var reverseLink = new NoteLink { NoteId = request.TargetNoteId, LinkedNoteId = id };

            _context.NoteLinks.AddRange(noteLink, reverseLink);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notes linked successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNoteById(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            // Remove related NoteLink entries
            var relatedLinks = await _context.NoteLinks
                .Where(nl => nl.NoteId == id || nl.LinkedNoteId == id)
                .ToListAsync();

            _context.NoteLinks.RemoveRange(relatedLinks);

            // Remove the note
            _context.Notes.Remove(note);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Note deleted successfully." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNoteById(string id, [FromBody] UpdateNoteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var note = await _context.Notes
                .Where(n => n.Id == id && n.UserId == userId)
                .FirstOrDefaultAsync();

            if (note == null)
            {
                return NotFound(new { error = "Note not found." });
            }

            // Update note properties
            note.Title = request.Title;
            note.Content = request.Content;
            note.IsPinned = request.IsPinned;
            note.IsFavorite = request.IsFavorite;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Note updated successfully." });
        }

    }
}
