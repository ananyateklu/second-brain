// SecondBrain.Api/DTOs/Auth/UserResponse.cs
namespace SecondBrain.Api.DTOs.Auth
{
    public class UserResponse
    {
        public string Id { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public DateTime CreatedAt { get; set; }
        public int ExperiencePoints { get; set; }
        public int Level { get; set; }
        public string Avatar { get; set; }
        public int XpForNextLevel { get; set; }
        public int LevelProgress { get; set; }
        public int AchievementCount { get; set; }
        public int TotalXPFromAchievements { get; set; }
    }
}