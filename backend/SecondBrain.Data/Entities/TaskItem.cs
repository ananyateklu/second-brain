using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public enum TaskStatus
    {
        Incomplete,
        Completed
    }

    public enum TaskPriority
    {
        Low = 1,
        Medium = 2,
        High = 3
    }

    public class TaskItem
    {
        [Key]
        [MaxLength(50)]
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public TaskStatus Status { get; set; }
        public TaskPriority Priority { get; set; }
        public string Tags { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Foreign Key
        public string UserId { get; set; } = string.Empty;
        public User User { get; set; } = null!;

        // Navigation Properties
        public ICollection<TaskItemNote> TaskItemNotes { get; set; } = new List<TaskItemNote>();
    }
}
