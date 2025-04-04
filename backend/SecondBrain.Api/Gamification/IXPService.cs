namespace SecondBrain.Api.Gamification
{
    public interface IXPService
    {
        Task<(int newXP, int newLevel, bool leveledUp)> AwardXPAsync(string userId, string action, int? customXP = null, string? itemId = null, string? itemTitle = null);
        int CalculateLevel(int experiencePoints);
        Task<(int currentXP, int xpForNextLevel, float progress)> GetLevelProgressAsync(string userId);
        Task<object> GetXPBreakdownAsync(string userId);
    }
} 