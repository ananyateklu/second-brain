using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class Activity
    {
        [Key]
        [MaxLength(36)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(450)]
        public string UserId { get; set; }

        [Required]
        public string ActionType { get; set; }  // e.g., create, edit, delete

        [Required]
        public string ItemType { get; set; }    // e.g., note, task, idea, reminder

        [Required]
        public string ItemId { get; set; }

        [Required]
        public string ItemTitle { get; set; }

        [Required]
        public string Description { get; set; }

        public string MetadataJson { get; set; } // JSON serialized metadata

        [Required]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Navigation property (optional)
        [ForeignKey("UserId")]
        public User User { get; set; }
    }
}
