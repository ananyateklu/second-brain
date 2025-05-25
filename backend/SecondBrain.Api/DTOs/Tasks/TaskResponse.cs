using SecondBrain.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondBrain.Api.DTOs.Tasks
{
    public class LinkedItemDto
    {
        public required string Id { get; set; } = string.Empty;
        public required string Title { get; set; } = string.Empty;
        public required string Type { get; set; } = string.Empty; // "note" or "idea"
        public DateTime CreatedAt { get; set; }
    }

    public class TaskResponse
    {
        public required string Id { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required string Status { get; set; } // 'incomplete' or 'completed'
        public required string Priority { get; set; } // 'low', 'medium', 'high'
        public DateTime? DueDate { get; set; }
        public required List<string> Tags { get; set; }
        public required List<LinkedItemDto> LinkedItems { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public required string UserId { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }

        public static TaskResponse FromEntity(TaskItem task, Dictionary<string, (string Type, string Title)>? linkedItemsLookup = null)
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
                LinkedItems = linkedItemsLookup != null 
                    ? task.TaskLinks
                        .Where(tl => !tl.IsDeleted && linkedItemsLookup.ContainsKey(tl.LinkedItemId))
                        .Select(tl => new LinkedItemDto
                        {
                            Id = tl.LinkedItemId,
                            Title = linkedItemsLookup[tl.LinkedItemId].Title,
                            Type = tl.LinkType,
                            CreatedAt = tl.CreatedAt
                        })
                        .ToList()
                    : new List<LinkedItemDto>(), // Return empty list if no lookup provided
                IsDeleted = task.IsDeleted,
                DeletedAt = task.DeletedAt
            };
        }
    }
}
