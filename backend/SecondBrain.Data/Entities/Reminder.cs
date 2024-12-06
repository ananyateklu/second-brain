using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public enum RepeatInterval
    {
        Daily,
        Weekly,
        Monthly,
        Yearly,
        Custom
    }

    public class Reminder
    {
        [Key]
        [MaxLength(50)]
        public string Id { get; set; } = string.Empty; // Initialized to empty string
        public string Title { get; set; } = string.Empty; // Initialized to empty string
        public string Description { get; set; } = string.Empty; // Initialized to empty string
        public DateTime DueDateTime { get; set; }
        public RepeatInterval? RepeatInterval { get; set; }
        public string? CustomRepeatPattern { get; set; } // Made nullable since it's optional
        public bool IsSnoozed { get; set; }
        public DateTime? SnoozeUntil { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Foreign Key
        public string UserId { get; set; } = string.Empty; // Initialized to empty string
        public User User { get; set; } = null!; // Suppress null warning since EF Core sets it

        public string Tags { get; set; } = string.Empty; // Ensure this property exists and is mapped

        // Add these properties
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        // Navigation property for linked items
        public ICollection<ReminderLink> ReminderLinks { get; set; } = new List<ReminderLink>();
    }
}
