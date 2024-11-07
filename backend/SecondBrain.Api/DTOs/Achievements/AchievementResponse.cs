namespace SecondBrain.Api.DTOs.Achievements
{
    public class AchievementResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int XPValue { get; set; }
        public string Icon { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }
} 