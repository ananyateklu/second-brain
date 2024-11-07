namespace SecondBrain.Services.Gamification
{
    public class UnlockedAchievement
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int XPAwarded { get; set; }
        public int NewTotalXP { get; set; }
        public int NewLevel { get; set; }
        public bool LeveledUp { get; set; }
    }
} 