using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class Tag
    {
        [Key]
        [MaxLength(36)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Navigation properties
        public ICollection<NoteTag> NoteTags { get; set; } = new List<NoteTag>();
        public ICollection<ReminderTag> ReminderTags { get; set; } = new List<ReminderTag>();
        public ICollection<IdeaTag> IdeaTags { get; set; } = new List<IdeaTag>();
        // Add other navigation properties as needed
    }
} 