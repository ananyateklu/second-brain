using System;
using System.Collections.Generic;

namespace SecondBrain.Data.Entities
{
    public class User
    {
        public string Id { get; set; } = string.Empty; // Initialized to empty string
        public string Email { get; set; } = string.Empty; // Initialized to empty string
        public string Name { get; set; } = string.Empty; // Initialized to empty string
        public string PasswordHash { get; set; } = string.Empty; // Initialized to empty string
        public DateTime CreatedAt { get; set; }

        // Navigation Properties
        public ICollection<Note> Notes { get; set; } = new List<Note>(); // Initialized to empty list
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>(); // Initialized to empty list
        public ICollection<Reminder> Reminders { get; set; } = new List<Reminder>(); // Initialized to empty list
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>(); // Initialized to empty list
    }
}
