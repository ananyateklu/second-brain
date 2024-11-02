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

        public bool IsDeleted { get; set; } = false;
    }
} 