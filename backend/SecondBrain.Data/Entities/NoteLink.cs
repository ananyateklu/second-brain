using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class NoteLink
    {
        // Composite Key will be configured in DataContext.OnModelCreating
        [Required]
        [MaxLength(36)]
        public required string NoteId { get; set; } // FK to Note
        [ForeignKey("NoteId")]
        public Note? Note { get; set; }

        [Required]
        [MaxLength(450)] // To accommodate longer IDs like Reminders.Id
        public required string LinkedItemId { get; set; } // ID of the linked entity (was LinkedNoteId)
        
        [Required]
        [MaxLength(50)]
        public required string LinkedItemType { get; set; } // Type: "Note", "Idea", "Task", "Reminder"

        [MaxLength(50)]
        public string? LinkType { get; set; } // Optional: "related", "reference", etc.

        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(450)]
        public string? CreatedBy { get; set; } // FK to User Id
        [ForeignKey("CreatedBy")]
        public User? UserCreator { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
} 