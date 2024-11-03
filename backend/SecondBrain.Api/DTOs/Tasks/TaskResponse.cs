using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondBrain.Api.DTOs.Tasks
{
    public class TaskResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; } // 'incomplete' or 'completed'
        public string Priority { get; set; } // 'low', 'medium', 'high'
        public DateTime? DueDate { get; set; }
        public List<string> Tags { get; set; }
        public List<string> LinkedNotes { get; set; } = new List<string>();
        public List<string> LinkedIdeas { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UserId { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        public static TaskResponse FromEntity(TaskItem task)
        {
            return new TaskResponse
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status.ToString().ToLower(),
                Priority = task.Priority.ToString().ToLower(),
                DueDate = task.DueDate,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                UserId = task.UserId,
                Tags = string.IsNullOrEmpty(task.Tags) ? new List<string>() : task.Tags.Split(',').ToList(),
                LinkedNotes = task.TaskItemNotes?.Select(tn => tn.NoteId).ToList() ?? new List<string>(),
                // LinkedIdeas handling if applicable
                IsDeleted = task.IsDeleted,
                DeletedAt = task.DeletedAt
            };
        }
    }
}
