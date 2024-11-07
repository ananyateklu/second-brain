using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class Achievement
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public int XPValue { get; set; } = 0;

        [MaxLength(255)]
        public string? Icon { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        // Navigation property
        public ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();
    }
} 