using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class Note
    {
        [Key]
        [MaxLength(36)]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public string? Tags { get; set; }

        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }
        
        [Obsolete("This property is deprecated. Use the Idea entity instead of filtering notes with IsIdea=true.")]
        public bool IsIdea { get; set; }
        
        public string? Metadata { get; set; }

        // Foreign Key
        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        // Navigation Properties for generalized links originating from this Note
        public ICollection<NoteLink> NoteLinks { get; set; } = new List<NoteLink>();
    }
}
