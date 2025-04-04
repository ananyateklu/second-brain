using System;

namespace SecondBrain.Data.Entities
{
    public class XPHistoryItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;
        public string Source { get; set; } = string.Empty; // "Note", "Task", "Reminder", "Link", "Achievement", etc.
        public string Action { get; set; } = string.Empty; // "Create", "Complete", "Update", etc.
        public int Amount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? ItemId { get; set; } // Optional reference to the item that generated XP
        public string? ItemTitle { get; set; } // Optional title of the item
    }
} 