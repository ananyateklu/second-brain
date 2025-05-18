using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Data;
using SecondBrain.Api.DTOs.Achievements;
using System.Security.Claims;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AchievementsController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ILogger<AchievementsController> _logger;

        public AchievementsController(DataContext context, ILogger<AchievementsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<List<AchievementResponse>>> GetAllAchievements()
        {
            try
            {
                var achievements = await _context.Achievements
                    .Select(a => new AchievementResponse
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Description = a.Description ?? string.Empty,
                        XPValue = a.XPValue,
                        Icon = a.Icon ?? string.Empty,
                        Type = a.Type
                    })
                    .ToListAsync();

                return Ok(achievements);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving achievements");
                return StatusCode(500, new { error = "An error occurred while retrieving achievements." });
            }
        }

        [HttpGet("me")]
        public async Task<ActionResult<UserAchievementsResponse>> GetMyAchievements()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var userAchievements = await _context.UserAchievements
                    .Include(ua => ua.Achievement)
                    .Where(ua => ua.UserId == userId)
                    .OrderByDescending(ua => ua.DateAchieved)
                    .Select(ua => new UnlockedAchievementResponse
                    {
                        Id = ua.Achievement.Id,
                        Name = ua.Achievement.Name,
                        Description = ua.Achievement.Description ?? string.Empty,
                        XPValue = ua.Achievement.XPValue,
                        Icon = ua.Achievement.Icon ?? string.Empty,
                        Type = ua.Achievement.Type,
                        DateAchieved = ua.DateAchieved
                    })
                    .ToListAsync();

                var totalAchievements = await _context.Achievements.CountAsync();
                var unlockedCount = userAchievements.Count;
                var totalXP = userAchievements.Sum(a => a.XPValue);

                return Ok(new UserAchievementsResponse
                {
                    Achievements = userAchievements,
                    TotalAchievements = totalAchievements,
                    UnlockedCount = unlockedCount,
                    CompletionPercentage = (double)unlockedCount / totalAchievements * 100,
                    TotalXPFromAchievements = totalXP
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user achievements");
                return StatusCode(500, new { error = "An error occurred while retrieving user achievements." });
            }
        }

        [HttpGet("progress")]
        public async Task<ActionResult<AchievementProgressResponse>> GetAchievementProgress()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var noteCount = await _context.Notes.CountAsync(n => n.UserId == userId && !n.IsDeleted);
                var linkCount = await _context.NoteLinks.CountAsync(nl => nl.Note != null && nl.Note.UserId == userId && !nl.IsDeleted);

                var progress = new AchievementProgressResponse
                {
                    Notes = new ProgressStats
                    {
                        Current = noteCount,
                        NextMilestone = GetNextMilestone(noteCount, new[] { 1, 10, 50, 100 })
                    },
                    NoteLinks = new ProgressStats
                    {
                        Current = linkCount,
                        NextMilestone = GetNextMilestone(linkCount, new[] { 1, 50 })
                    }
                };

                // The achievement unlocking logic is handled by AchievementService.CheckAndUnlockAchievementsAsync
                // when the actual link creation event occurs. This endpoint should focus on reporting progress.
                // Removing the unlock attempt from here to avoid redundancy and keep concerns separated.
                /*
                // Check First Link achievement
                var firstLinkAchievement = await _context.Achievements.FirstOrDefaultAsync(a => a.Name == "First Link Created");
                if (firstLinkAchievement != null && !await _context.UserAchievements.AnyAsync(ua => ua.UserId == userId && ua.AchievementId == firstLinkAchievement.Id))
                {
                    if (linkCount > 0)
                    {
                        await CreateUserAchievement(user, firstLinkAchievement);
                    }
                }
                */

                return Ok(progress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving achievement progress");
                return StatusCode(500, new { error = "An error occurred while retrieving achievement progress." });
            }
        }

        private static int GetNextMilestone(int current, int[] milestones)
        {
            return milestones.FirstOrDefault(m => m > current, milestones[milestones.Length - 1]);
        }
    }
} 