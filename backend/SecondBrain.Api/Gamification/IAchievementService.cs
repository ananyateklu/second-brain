using System.Collections.Generic;
using System.Threading.Tasks;
using SecondBrain.Services.Gamification;

namespace SecondBrain.Api.Gamification
{
    public interface IAchievementService
    {
        Task InitializeAchievementsAsync();
        Task<List<UnlockedAchievement>> CheckAndUnlockAchievementsAsync(string userId, string actionType);
    }
} 