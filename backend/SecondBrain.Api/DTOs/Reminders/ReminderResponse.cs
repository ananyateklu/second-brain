using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class LinkedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "note" or "idea"
        public DateTime CreatedAt { get; set; }
        public string? Description { get; set; }
    }

    public class ReminderResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DueDateTime { get; set; }
        public string? RepeatInterval { get; set; }
        public string? CustomRepeatPattern { get; set; }
        public bool IsSnoozed { get; set; }
        public DateTime? SnoozeUntil { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public List<string> Tags { get; set; } = new();
        public List<LinkedItemDto> LinkedItems { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public static ReminderResponse FromEntity(Reminder reminder, Dictionary<string, dynamic>? linkedItems)
        {
            var response = new ReminderResponse
            {
                Id = reminder.Id,
                Title = reminder.Title,
                Description = reminder.Description,
                DueDateTime = reminder.DueDateTime,
                RepeatInterval = reminder.RepeatInterval?.ToString(),
                CustomRepeatPattern = reminder.CustomRepeatPattern,
                IsSnoozed = reminder.IsSnoozed,
                SnoozeUntil = reminder.SnoozeUntil,
                IsCompleted = reminder.IsCompleted,
                CompletedAt = reminder.CompletedAt,
                Tags = reminder.Tags?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                CreatedAt = reminder.CreatedAt,
                UpdatedAt = reminder.UpdatedAt
            };

            if (linkedItems != null)
            {
                response.LinkedItems = reminder.ReminderLinks
                    .Where(rl => !rl.IsDeleted && linkedItems.ContainsKey(rl.LinkedItemId))
                    .Select(rl => new LinkedItemDto
                    {
                        Id = rl.LinkedItemId,
                        Title = linkedItems[rl.LinkedItemId].Title,
                        Type = rl.LinkType,
                        CreatedAt = rl.CreatedAt,
                        Description = rl.Description
                    })
                    .ToList();
            }

            return response;
        }
    }
}
