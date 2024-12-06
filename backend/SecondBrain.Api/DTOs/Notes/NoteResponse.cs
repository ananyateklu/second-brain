using System;
using System.Collections.Generic;
using System.Linq;
using SecondBrain.Data.Entities;
using SecondBrain.Api.Gamification;
using SecondBrain.Services.Gamification;

namespace SecondBrain.Api.DTOs.Notes
{
    public class LinkedReminderDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime DueDateTime { get; set; }
        public bool IsCompleted { get; set; }
        public bool IsSnoozed { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class NoteResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new List<string>();
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public bool IsIdea { get; set; }
        public List<string> LinkedNoteIds { get; set; } = new List<string>();
        public List<LinkedTaskDto> LinkedTasks { get; set; } = new List<LinkedTaskDto>();
        public List<LinkedReminderDto> LinkedReminders { get; set; } = new List<LinkedReminderDto>();
        
        // Gamification properties
        public int XPAwarded { get; set; }
        public int NewTotalXP { get; set; }
        public bool LeveledUp { get; set; }
        public int NewLevel { get; set; }
        public List<UnlockedAchievement> UnlockedAchievements { get; set; } = new List<UnlockedAchievement>();

        public static NoteResponse FromEntity(Note note)
        {
            return new NoteResponse
            {
                Id = note.Id,
                Title = note.Title,
                Content = note.Content,
                Tags = !string.IsNullOrEmpty(note.Tags)
                    ? note.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    : new List<string>(),
                IsPinned = note.IsPinned,
                IsFavorite = note.IsFavorite,
                IsArchived = note.IsArchived,
                IsDeleted = note.IsDeleted,
                DeletedAt = note.DeletedAt,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
                ArchivedAt = note.ArchivedAt,
                IsIdea = note.IsIdea,
                LinkedNoteIds = note.NoteLinks
                    .Where(nl => !nl.IsDeleted)
                    .Select(nl => nl.LinkedNoteId)
                    .ToList(),
                LinkedTasks = note.TaskLinks
                    .Where(tl => !tl.IsDeleted && tl.Task != null)
                    .Select(tl => new LinkedTaskDto
                    {
                        Id = tl.TaskId,
                        Title = tl.Task.Title,
                        Status = tl.Task.Status.ToString().ToLower(),
                        Priority = tl.Task.Priority.ToString().ToLower(),
                        DueDate = tl.Task.DueDate,
                        CreatedAt = tl.CreatedAt
                    })
                    .ToList(),
                LinkedReminders = note.ReminderLinks
                    .Where(rl => !rl.IsDeleted && rl.Reminder != null)
                    .Select(rl => new LinkedReminderDto
                    {
                        Id = rl.ReminderId,
                        Title = rl.Reminder.Title,
                        Description = rl.Reminder.Description,
                        DueDateTime = rl.Reminder.DueDateTime,
                        IsCompleted = rl.Reminder.IsCompleted,
                        IsSnoozed = rl.Reminder.IsSnoozed,
                        CreatedAt = rl.Reminder.CreatedAt,
                        UpdatedAt = rl.Reminder.UpdatedAt
                    })
                    .ToList()
            };
        }
    }

    public class LinkedTaskDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
