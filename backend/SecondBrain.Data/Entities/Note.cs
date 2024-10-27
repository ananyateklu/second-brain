using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class Note
    {
        [Key]
        [MaxLength(36)]
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Foreign Key
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;

        // Navigation Properties
        public ICollection<TaskItemNote> TaskItemNotes { get; set; } = new List<TaskItemNote>();
    }
}
