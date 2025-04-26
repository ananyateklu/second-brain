using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    // Represents stored credentials for a third-party integration for a specific user.
    public class UserIntegrationCredential
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(450)] // Changed from 36 to 450 to match User.Id field length
        public required string UserId { get; set; }

        [Required]
        [MaxLength(50)] // e.g., "TickTick", "GoogleCalendar"
        public required string Provider { get; set; }

        [MaxLength(2000)]
        public required string AccessToken { get; set; }

        [MaxLength(2000)]
        public required string RefreshToken { get; set; }

        [MaxLength(50)]
        public required string TokenType { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public required string Scope { get; set; }

        [MaxLength(50)]
        public string? AccountId { get; set; }

        [MaxLength(100)]
        public string? AccountName { get; set; }

        [MaxLength(200)]
        public string? AccountEmail { get; set; }

        [MaxLength(500)]
        public string? AdditionalData { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Optional: Define the relationship to your User entity if needed
        // [ForeignKey("UserId")]
        // public virtual User User { get; set; }
    }
} 