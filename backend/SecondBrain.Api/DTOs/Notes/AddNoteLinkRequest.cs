using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Api.DTOs.Notes
{
    public class AddNoteLinkRequest
    {
        [Required]
        public required string LinkedItemId { get; set; }

        [Required]
        public required string LinkedItemType { get; set; } // E.g., "Note", "Idea", "Task", "Reminder"
        
        public string? LinkType { get; set; } // Optional: E.g., "related", "reference", "depends_on"
    }
} 