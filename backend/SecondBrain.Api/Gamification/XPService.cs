using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Api.Gamification
{
    public static class XPValues
    {
        public const int CreateNote = 5;
        public const int CreateIdea = 5;
        public const int CreateLink = 2;
        public const int CompleteTask = 10;
        public const int CompleteReminder = 10;
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
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("User not found", nameof(userId));
            }

            int xpToAward = customXP ?? GetXPForAction(action);
            int oldLevel = user.Level;
            
            // Award XP
            user.ExperiencePoints += xpToAward;
            
            // Calculate new level
            int newLevel = CalculateLevel(user.ExperiencePoints);
            bool leveledUp = newLevel > oldLevel;
            
            if (leveledUp)
            {
                user.Level = newLevel;
                _logger.LogInformation(
                    "User {UserId} leveled up from {OldLevel} to {NewLevel}",
                    userId, oldLevel, newLevel
                );
            }

            await _context.SaveChangesAsync();

            return (user.ExperiencePoints, newLevel, leveledUp);
        }

        private int GetXPForAction(string action)
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
            int level = 1;
            for (int i = 0; i < LevelThresholds.Length; i++)
            {
                if (experiencePoints >= LevelThresholds[i])
                {
                    level = i + 1;
                }
                else
                {
                    break;
                }
            }
            return level;
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
            int progress = (int)((currentXP - currentLevelThreshold) / (float)(nextLevelThreshold - currentLevelThreshold) * 100);

            return (currentXP, xpForNextLevel, progress);
        }
    }
} 