using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class TaskItemNote
    {
        [Required]
        [MaxLength(36)]
        public string TaskItemId { get; set; } = string.Empty;

        public TaskItem TaskItem { get; set; } = null!;

        [Required]
        [MaxLength(36)]
        public string NoteId { get; set; } = string.Empty;

        public Note Note { get; set; } = null!;
    }
}
