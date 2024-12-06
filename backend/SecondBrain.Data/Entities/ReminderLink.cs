using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class ReminderLink
    {
        [Key, Column(Order = 0)]
        public string ReminderId { get; set; } = string.Empty;

        [Key, Column(Order = 1)]
        public string LinkedItemId { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string LinkType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        // Navigation properties
        public virtual Reminder Reminder { get; set; } = null!;
        public virtual Note LinkedItem { get; set; } = null!;
        public virtual User Creator { get; set; } = null!;
    }
}