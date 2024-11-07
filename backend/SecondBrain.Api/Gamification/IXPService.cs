namespace SecondBrain.Api.Gamification
{
    public interface IXPService
    {
        Task<(int newXP, int newLevel, bool leveledUp)> AwardXPAsync(string userId, string action, int? customXP = null);
        int CalculateLevel(int experiencePoints);
        Task<(int currentXP, int xpForNextLevel, int progress)> GetLevelProgressAsync(string userId);
    }
} 