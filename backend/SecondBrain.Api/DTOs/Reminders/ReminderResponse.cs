using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class ReminderResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime DueDateTime { get; set; }
        public bool IsSnoozed { get; set; }
        public DateTime? SnoozeUntil { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string RepeatInterval { get; set; }
        public string CustomRepeatPattern { get; set; }
        public List<string> Tags { get; set; } // New property
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UserId { get; set; }

        public static ReminderResponse FromEntity(Reminder reminder)
        {
            return new ReminderResponse
            {
                Id = reminder.Id,
                Title = reminder.Title,
                Description = reminder.Description,
                DueDateTime = reminder.DueDateTime,
                IsSnoozed = reminder.IsSnoozed,
                SnoozeUntil = reminder.SnoozeUntil,
                IsCompleted = reminder.IsCompleted,
                CompletedAt = reminder.CompletedAt,
                RepeatInterval = reminder.RepeatInterval?.ToString(),
                CustomRepeatPattern = reminder.CustomRepeatPattern,
                CreatedAt = reminder.CreatedAt,
                UpdatedAt = reminder.UpdatedAt,
                UserId = reminder.UserId,
                Tags = string.IsNullOrEmpty(reminder.Tags)
                    ? new List<string>()
                    : reminder.Tags.Split(',').ToList()
            };
        }
    }
}