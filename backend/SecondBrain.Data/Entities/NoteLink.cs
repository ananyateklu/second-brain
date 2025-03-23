using System;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class NoteLink
    {
        [Required]
        [MaxLength(36)]
        public string NoteId { get; set; } = string.Empty;

        public Note Note { get; set; } = null!;

        [Required]
        [MaxLength(36)]
        public string LinkedNoteId { get; set; } = string.Empty;

        public Note LinkedNote { get; set; } = null!;

        // Add a link type to match frontend model
        [MaxLength(50)]
        public string LinkType { get; set; } = "default";

        // Track when the link was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Track who created the link
        [MaxLength(450)]
        public string CreatedBy { get; set; } = string.Empty;

        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
    }
} 