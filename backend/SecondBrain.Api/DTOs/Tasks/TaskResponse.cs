using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondBrain.Api.DTOs.Tasks
{
    public class LinkedItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "note" or "idea"
        public DateTime CreatedAt { get; set; }
    }

    public class TaskResponse
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; } // 'incomplete' or 'completed'
        public string Priority { get; set; } // 'low', 'medium', 'high'
        public DateTime? DueDate { get; set; }
        public List<string> Tags { get; set; }
        public List<LinkedItemDto> LinkedItems { get; set; } = new();
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
                LinkedItems = task.TaskLinks
                    .Where(tl => !tl.IsDeleted)
                    .Select(tl => new LinkedItemDto
                    {
                        Id = tl.LinkedItemId,
                        Title = tl.LinkedItem.Title,
                        Type = tl.LinkType,
                        CreatedAt = tl.CreatedAt
                    })
                    .ToList(),
                IsDeleted = task.IsDeleted,
                DeletedAt = task.DeletedAt
            };
        }
    }
}
