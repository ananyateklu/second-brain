// SecondBrain.Api/DTOs/Auth/UserResponse.cs
namespace SecondBrain.Api.DTOs.Auth
{
    public class UserResponse
    {
        public required string Id { get; set; }
        public required string Email { get; set; }
        public required string Name { get; set; }
        public DateTime CreatedAt { get; set; }
        public int ExperiencePoints { get; set; }
        public int Level { get; set; }
        public required string Avatar { get; set; }
        public int XpForNextLevel { get; set; }
        public float LevelProgress { get; set; }
        public int AchievementCount { get; set; }
        public int TotalXPFromAchievements { get; set; }
    }
}