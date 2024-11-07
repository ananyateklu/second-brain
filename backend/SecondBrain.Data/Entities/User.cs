using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class User
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Gamification properties
        public int ExperiencePoints { get; set; } = 0;

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public int Level { get; set; }

        public string Avatar { get; set; } = string.Empty;

        // Navigation Properties
        public ICollection<Note> Notes { get; set; } = new List<Note>();
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
        public ICollection<Reminder> Reminders { get; set; } = new List<Reminder>();
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
        public ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();
    }
}
