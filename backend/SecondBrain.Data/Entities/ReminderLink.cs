using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class ReminderLink
    {
        [Key]
        [Column(Order = 0)]
        [Required]
        [MaxLength(450)]
        public string ReminderId { get; set; } = string.Empty;

        [Key]
        [Column(Order = 1)]
        [Required]
        [MaxLength(36)]
        public string LinkedItemId { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        
        [Required]
        [MaxLength(450)]
        public string CreatedBy { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LinkType { get; set; } = string.Empty;  // "note" or "idea"

        public string? Description { get; set; }
        
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        // Navigation properties
        [ForeignKey("ReminderId")]
        public Reminder Reminder { get; set; } = null!;

        [ForeignKey("LinkedItemId")]
        public Note LinkedItem { get; set; } = null!;

        [ForeignKey("CreatedBy")]
        public User Creator { get; set; } = null!;
    }
}