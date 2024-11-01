using System;

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

    }
}
