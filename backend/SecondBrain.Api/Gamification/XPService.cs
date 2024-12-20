using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Api.Gamification
{
    public static class XPValues
    {
        public const int CreateNote = 10;
        public const int CreateIdea = 20;
        public const int CreateLink = 5;
        public const int CompleteTask = 15;
        public const int CompleteReminder = 15;
        public const int CreateTask = 3;
        public const int CreateReminder = 3;
        public const int UpdateContent = 1;
    }

    public class XPService : IXPService
    {
        private readonly DataContext _context;
        private readonly ILogger<XPService> _logger;

        // Level thresholds
        private static readonly int[] LevelThresholds = {
            0,      // Level 1
            100,    // Level 2
            250,    // Level 3
            450,    // Level 4
            700,    // Level 5
            1000,   // Level 6
            1350,   // Level 7
            1750,   // Level 8
            2200,   // Level 9
            2700    // Level 10
        };

        public XPService(DataContext context, ILogger<XPService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<(int newXP, int newLevel, bool leveledUp)> AwardXPAsync(string userId, string action, int? customXP = null)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // First get the user's current state
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found", nameof(userId));
                }

                int xpToAward = customXP ?? GetXPForAction(action);
                int oldLevel = user.Level;
                int oldXP = user.ExperiencePoints;
                int newXP = oldXP + xpToAward;
                
                // Calculate new level
                int newLevel = CalculateLevel(newXP);
                bool leveledUp = newLevel > oldLevel;

                _logger.LogInformation(
                    "Level calculation results - Old Level: {OldLevel}, New Level: {NewLevel}, Old XP: {OldXP}, New XP: {NewXP}, XP Awarded: {XPAwarded}",
                    oldLevel, newLevel, oldXP, newXP, xpToAward
                );

                // Step 1: Update using raw SQL without OUTPUT clause
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE Users SET ExperiencePoints = @p0, Level = @p1 WHERE Id = @p2",
                    newXP, newLevel, userId);

                await transaction.CommitAsync();

                // Step 2: Verify the update
                var updatedUser = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (updatedUser == null)
                {
                    throw new InvalidOperationException("Failed to verify user update");
                }

                _logger.LogInformation(
                    "Verification - Updated user state: Level = {Level}, XP = {XP}",
                    updatedUser.Level, updatedUser.ExperiencePoints
                );

                if (updatedUser.Level != newLevel || updatedUser.ExperiencePoints != newXP)
                {
                    _logger.LogWarning(
                        "Mismatch detected - Expected: Level {ExpectedLevel}, XP {ExpectedXP}, Actual: Level {ActualLevel}, XP {ActualXP}",
                        newLevel, newXP, updatedUser.Level, updatedUser.ExperiencePoints
                    );
                }

                return (updatedUser.ExperiencePoints, updatedUser.Level, leveledUp);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error awarding XP to user {UserId}", userId);
                throw new InvalidOperationException($"Failed to award XP to user {userId}", ex);
            }
        }

        private static int GetXPForAction(string action)
        {
            return action.ToLower() switch
            {
                "createnote" => XPValues.CreateNote,
                "createidea" => XPValues.CreateIdea,
                "createlink" => XPValues.CreateLink,
                "completetask" => XPValues.CompleteTask,
                "completereminder" => XPValues.CompleteReminder,
                "createtask" => XPValues.CreateTask,
                "createreminder" => XPValues.CreateReminder,
                "updatecontent" => XPValues.UpdateContent,
                _ => 0
            };
        }

        public int CalculateLevel(int experiencePoints)
        {
            _logger.LogInformation("Starting level calculation for XP: {XP}", experiencePoints);

            // Simply iterate through thresholds to find appropriate level
            for (int i = 0; i < LevelThresholds.Length; i++)
            {
                // If we're at the last threshold and XP is higher, return max level
                if (i == LevelThresholds.Length - 1)
                {
                    if (experiencePoints >= LevelThresholds[i])
                    {
                        _logger.LogInformation("Max level {Level} reached with XP {XP}", i + 1, experiencePoints);
                        return i + 1;
                    }
                }
                // Otherwise check if XP is between current and next threshold
                else if (experiencePoints >= LevelThresholds[i] && experiencePoints < LevelThresholds[i + 1])
                {
                    _logger.LogInformation("Level {Level} calculated for XP {XP} between {Current} and {Next}", 
                        i + 1, experiencePoints, LevelThresholds[i], LevelThresholds[i + 1]);
                    return i + 1;
                }
            }

            // Fallback to level 1 if no other conditions met
            _logger.LogInformation("Defaulting to level 1 for XP {XP}", experiencePoints);
            return 1;
        }

        public async Task<(int currentXP, int xpForNextLevel, int progress)> GetLevelProgressAsync(string userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("User not found", nameof(userId));
            }

            int currentLevel = user.Level;
            int currentXP = user.ExperiencePoints;
            
            int currentLevelThreshold = LevelThresholds[currentLevel - 1];
            int nextLevelThreshold = currentLevel < LevelThresholds.Length 
                ? LevelThresholds[currentLevel]
                : LevelThresholds[^1];

            int xpForNextLevel = nextLevelThreshold - currentXP;
            int progress = (int)((float)(currentXP - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold) * 100);

            return (currentXP, xpForNextLevel, progress);
        }
    }
} 