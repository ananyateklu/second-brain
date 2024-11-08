using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using SecondBrain.Services.Gamification;

namespace SecondBrain.Api.Gamification
{
    public class AchievementService : IAchievementService
    {
        private readonly DataContext _context;
        private readonly IXPService _xpService;
        private readonly ILogger<AchievementService> _logger;
        private static readonly Dictionary<string, Achievement> _achievementCache = new();

        public static class AchievementTypes
        {
            // Note achievements
            public const string FirstNote = "FIRST_NOTE";
            public const string NoteTaker = "NOTE_TAKER";
            public const string NoteExpert = "NOTE_EXPERT";
            public const string NoteMaster = "NOTE_MASTER";
            public const string FirstNoteLink = "FIRST_NOTE_LINK";
            public const string NoteLinkMaster = "NOTE_LINK_MASTER";
            public const string FirstBookmark = "FIRST_BOOKMARK";
            public const string BookmarkMaster = "BOOKMARK_MASTER";
            
        }

        public AchievementService(
            DataContext context,
            IXPService xpService,
            ILogger<AchievementService> logger)
        {
            _context = context;
            _xpService = xpService;
            _logger = logger;
        }

        public async Task InitializeAchievementsAsync()
        {
            if (!await _context.Achievements.AnyAsync())
            {
                var achievements = new List<Achievement>
                {
                    new Achievement
                    {
                        Name = "First Note",
                        Description = "Created your first note",
                        XPValue = 10,
                        Icon = "📝",
                        Type = AchievementTypes.FirstNote
                    },
                    new Achievement
                    {
                        Name = "Note Taker",
                        Description = "Created 10 notes",
                        XPValue = 50,
                        Icon = "📚",
                        Type = AchievementTypes.NoteTaker
                    },
                    new Achievement
                    {
                        Name = "Note Expert",
                        Description = "Created 50 notes",
                        XPValue = 200,
                        Icon = "🎓",
                        Type = AchievementTypes.NoteExpert
                    },
                    new Achievement
                    {
                        Name = "Note Master",
                        Description = "Created 100 notes",
                        XPValue = 500,
                        Icon = "👑",
                        Type = AchievementTypes.NoteMaster
                    },
                    new Achievement
                    {
                        Name = "First Link",
                        Description = "Created your first note link",
                        XPValue = 15,
                        Icon = "🔗",
                        Type = AchievementTypes.FirstNoteLink
                    },
                    new Achievement
                    {
                        Name = "Link Master",
                        Description = "Created 50 note links",
                        XPValue = 300,
                        Icon = "⛓️",
                        Type = AchievementTypes.NoteLinkMaster
                    }
                };

                _context.Achievements.AddRange(achievements);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<UnlockedAchievement>> CheckAndUnlockAchievementsAsync(string userId, string actionType)
        {
            var unlockedAchievements = new List<UnlockedAchievement>();
            var user = await _context.Users
                .Include(u => u.UserAchievements)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                throw new ArgumentException("User not found", nameof(userId));
            }

            switch (actionType)
            {
                case "createnote":
                    unlockedAchievements.AddRange(await CheckNoteAchievementsAsync(user));
                    break;
                case "createlink":
                    unlockedAchievements.AddRange(await CheckNoteLinkAchievementsAsync(user));
                    break;
            }

            if (unlockedAchievements.Any())
            {
                await _context.SaveChangesAsync();
            }

            return unlockedAchievements;
        }

        private async Task<List<UnlockedAchievement>> CheckNoteAchievementsAsync(User user)
        {
            var unlockedAchievements = new List<UnlockedAchievement>();
            var noteCount = await _context.Notes.CountAsync(n => n.UserId == user.Id && !n.IsDeleted);

            // Check First Note Achievement
            if (noteCount == 1)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.FirstNote);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            // Check Note Taker Achievement
            if (noteCount >= 10)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.NoteTaker);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            // Check Note Expert Achievement
            if (noteCount >= 50)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.NoteExpert);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            // Check Note Master Achievement
            if (noteCount >= 100)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.NoteMaster);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            return unlockedAchievements;
        }

        private async Task<List<UnlockedAchievement>> CheckNoteLinkAchievementsAsync(User user)
        {
            var unlockedAchievements = new List<UnlockedAchievement>();
            var linkCount = await _context.NoteLinks
                .CountAsync(nl => nl.Note.UserId == user.Id && !nl.IsDeleted);

            // Check First Link Achievement
            if (linkCount == 1)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.FirstNoteLink);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            // Check Link Master Achievement
            if (linkCount >= 50)
            {
                var achievement = await UnlockAchievementAsync(user, AchievementTypes.NoteLinkMaster);
                if (achievement != null) unlockedAchievements.Add(achievement);
            }

            return unlockedAchievements;
        }

        private async Task<UnlockedAchievement?> UnlockAchievementAsync(User user, string achievementType)
        {
            var achievement = await GetAchievementByTypeAsync(achievementType);
            if (achievement == null) return null;

            _logger.LogInformation(
                "Checking achievement {Type} for user {UserId}",
                achievementType, user.Id
            );

            var existingUnlock = await _context.UserAchievements
                .FirstOrDefaultAsync(ua => ua.UserId == user.Id && ua.AchievementId == achievement.Id);

            if (existingUnlock != null) return null;

            var userAchievement = new UserAchievement
            {
                UserId = user.Id,
                AchievementId = achievement.Id,
                DateAchieved = DateTime.UtcNow
            };

            _context.UserAchievements.Add(userAchievement);
            
            // Award XP for the achievement
            var (newXP, newLevel, leveledUp) = await _xpService.AwardXPAsync(
                user.Id, 
                "achievement", 
                achievement.XPValue
            );

            await _context.SaveChangesAsync();

            return new UnlockedAchievement
            {
                Name = achievement.Name,
                Description = achievement.Description,
                Icon = achievement.Icon,
                XPAwarded = achievement.XPValue,
                NewTotalXP = newXP,
                NewLevel = newLevel,
                LeveledUp = leveledUp
            };
        }

        private async Task<Achievement?> GetAchievementByTypeAsync(string type)
        {
            if (_achievementCache.TryGetValue(type, out var cachedAchievement))
            {
                return cachedAchievement;
            }

            var achievement = await _context.Achievements
                .FirstOrDefaultAsync(a => a.Type == type);

            if (achievement != null)
            {
                _achievementCache[type] = achievement;
            }

            return achievement;
        }
    }
} 