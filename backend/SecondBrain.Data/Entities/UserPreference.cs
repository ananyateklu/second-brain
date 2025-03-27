using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class UserPreference
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string PreferenceType { get; set; } = string.Empty;

        [Required]
        public string Value { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
    }
} 