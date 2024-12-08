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
                // Use tracking query to get user
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new ArgumentException("User not found", nameof(userId));
                }

                int xpToAward = customXP ?? GetXPForAction(action);
                int oldLevel = user.Level;
                int oldXP = user.ExperiencePoints;

                // Award XP
                user.ExperiencePoints += xpToAward;
                
                // Calculate new level
                int newLevel = CalculateLevel(user.ExperiencePoints);
                bool leveledUp = newLevel > oldLevel;

                // Let the database trigger handle the level update
                // Only update ExperiencePoints through EF Core
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Reload the entity to get the updated level from the trigger
                await _context.Entry(user).ReloadAsync();

                _logger.LogInformation(
                    "XP Award - User {UserId}: Old XP: {OldXP}, New XP: {NewXP}, Old Level: {OldLevel}, New Level: {NewLevel}",
                    userId, oldXP, user.ExperiencePoints, oldLevel, user.Level
                );

                return (user.ExperiencePoints, user.Level, leveledUp);
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
            // Add logging to debug level calculation
            _logger.LogInformation("Calculating level for XP: {XP}", experiencePoints);

            for (int i = LevelThresholds.Length - 1; i >= 0; i--)
            {
                if (experiencePoints >= LevelThresholds[i])
                {
                    _logger.LogInformation(
                        "Found level {Level} for XP {XP} (Threshold: {Threshold})",
                        i + 1, experiencePoints, LevelThresholds[i]
                    );
                    return i + 1;
                }
            }

            _logger.LogInformation("Defaulting to level 1 for XP: {XP}", experiencePoints);
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