using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Data.Entities
{
    public class UserAchievement
    {
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public int AchievementId { get; set; }

        public DateTime DateAchieved { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [ForeignKey("AchievementId")]
        public Achievement Achievement { get; set; } = null!;
    }
} 