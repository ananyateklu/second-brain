using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace SecondBrain.Data.Entities
{
    public class TaskSyncMapping
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(36)] // Match TaskItem.Id length in Tasks table
        public required string LocalTaskId { get; set; }

        [Required]
        [MaxLength(100)] // TickTick IDs can be longer
        public required string TickTickTaskId { get; set; }

        [Required]
        [MaxLength(450)] // Match User.Id length
        public required string UserId { get; set; }

        [Required]
        [MaxLength(50)] // e.g., "TickTick"
        public required string Provider { get; set; }

        public DateTime LastSyncedAt { get; set; }

        // Navigation Properties
        [ForeignKey("LocalTaskId")]
        public virtual TaskItem? LocalTask { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
} 