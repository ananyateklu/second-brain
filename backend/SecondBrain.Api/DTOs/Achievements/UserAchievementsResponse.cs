namespace SecondBrain.Api.DTOs.Achievements
{
    public class UserAchievementsResponse
    {
        public List<UnlockedAchievementResponse> Achievements { get; set; } = new();
        public int TotalAchievements { get; set; }
        public int UnlockedCount { get; set; }
        public double CompletionPercentage { get; set; }
        public int TotalXPFromAchievements { get; set; }
    }
} 