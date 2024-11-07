namespace SecondBrain.Api.DTOs.Achievements
{
    public class AchievementProgressResponse
    {
        public ProgressStats Notes { get; set; } = new();
        public ProgressStats NoteLinks { get; set; } = new();
    }

    public class ProgressStats
    {
        public int Current { get; set; }
        public int NextMilestone { get; set; }
    }
} 