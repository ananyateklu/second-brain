using System;
using System.Threading.Tasks;

public class XPService : IXPService
{
    private readonly DataContext _context;
    private readonly ILogger<XPService> _logger;

    private static readonly int[] LevelThresholds = {
        0,      // Level 1: 0-99
        100,    // Level 2: 100-249
        250,    // Level 3: 250-449
        450,    // Level 4: 450-699
        700,    // Level 5: 700-999
        1000,   // Level 6: 1000-1349
        1350,   // Level 7: 1350-1749
        1750,   // Level 8: 1750-2199
        2200,   // Level 9: 2200-2699
        2700    // Level 10: 2700+
    };

    public XPService(DataContext context, ILogger<XPService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<(int currentXP, int xpForNextLevel, int progress)> GetLevelProgressAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new ArgumentException("User not found", nameof(userId));
        }

        _logger.LogInformation("Calculating level progress for user {UserId} with {XP} XP at level {Level}", 
            userId, user.ExperiencePoints, user.Level);

        int currentLevel = user.Level;
        int totalXP = user.ExperiencePoints;

        if (currentLevel < 1 || currentLevel > LevelThresholds.Length)
        {
            _logger.LogWarning("Invalid level {Level} for user {UserId}", currentLevel, userId);
            currentLevel = CalculateLevel(totalXP); // Recalculate correct level
            user.Level = currentLevel;
            await _context.SaveChangesAsync();
        }

        int currentLevelThreshold = LevelThresholds[currentLevel - 1];
        
        int nextLevelThreshold;
        if (currentLevel >= LevelThresholds.Length)
        {
            _logger.LogInformation("User {UserId} at max level {Level}", userId, currentLevel);
            return (totalXP - currentLevelThreshold, 0, 100);
        }
        else
        {
            nextLevelThreshold = LevelThresholds[currentLevel];
        }

        int xpInCurrentLevel = totalXP - currentLevelThreshold;
        int xpRequiredForNextLevel = nextLevelThreshold - currentLevelThreshold;
        
        double progressPercentage = (double)xpInCurrentLevel / xpRequiredForNextLevel * 100;
        int progress = (int)Math.Min(100, Math.Max(0, progressPercentage));

        _logger.LogInformation(
            "Level Progress Details - " +
            "Total XP: {TotalXP}, " +
            "Current Level: {CurrentLevel}, " +
            "Current Threshold: {CurrentThreshold}, " +
            "Next Threshold: {NextThreshold}, " +
            "XP in Level: {XPInLevel}, " +
            "XP Required: {XPRequired}, " +
            "Progress: {Progress}%",
            totalXP, currentLevel, currentLevelThreshold, nextLevelThreshold,
            xpInCurrentLevel, xpRequiredForNextLevel, progress
        );

        return (xpInCurrentLevel, xpRequiredForNextLevel - xpInCurrentLevel, progress);
    }

    public int CalculateLevel(int experiencePoints)
    {
        for (int i = LevelThresholds.Length - 1; i >= 0; i--)
        {
            if (experiencePoints >= LevelThresholds[i])
            {
                return i + 1;
            }
        }
        return 1;
    }

    public async Task<(int newXP, int newLevel, bool leveledUp)> AwardXPAsync(string userId, string action, int? customXP = null)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

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
                    "User {UserId} leveled up from {OldLevel} to {NewLevel} with {XP} XP",
                    userId, oldLevel, newLevel, user.ExperiencePoints
                );
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (user.ExperiencePoints, newLevel, leveledUp);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error awarding XP to user {UserId}", userId);
            throw;
        }
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
            "achievement" => 0, // Custom XP value will be provided
            _ => 0
        };
    }
} 