using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Auth;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using SecondBrain.Api.Gamification;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ITokenService _tokenService;
        private readonly IXPService _xpService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            DataContext context, 
            ITokenService tokenService,
            IXPService xpService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _tokenService = tokenService;
            _xpService = xpService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return Conflict(new { error = "User with this email already exists." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = request.Email,
                PasswordHash = passwordHash,
                Name = request.Name,
                CreatedAt = DateTime.UtcNow,
                ExperiencePoints = 0,
                Level = 1,
                Avatar = request.Avatar ?? string.Empty // Optional avatar during registration
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var tokens = await _tokenService.GenerateTokensAsync(user);
            return Ok(tokens);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Validate the request
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { error = "Email and Password are required." });
            }

            // Find the user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return Unauthorized(new { error = "Invalid credentials." });
            }

            // Verify the password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { error = "Invalid credentials." });
            }

            // Generate JWT tokens using the TokenService
            var tokens = await _tokenService.GenerateTokensAsync(user);

            return Ok(tokens);
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            if (string.IsNullOrEmpty(request.RefreshToken))
            {
                return BadRequest(new { error = "Refresh token is required." });
            }

            var tokens = await _tokenService.RefreshTokensAsync(request.RefreshToken);

            if (tokens == null)
            {
                return Unauthorized(new { error = "Invalid or expired refresh token." });
            }

            return Ok(tokens);
        }


        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { error = "User not found." });
                }

                // Get level progress
                var (currentXP, xpForNextLevel, progress) = await _xpService.GetLevelProgressAsync(userId);

                // Get achievement stats
                var achievementCount = await _context.UserAchievements
                    .CountAsync(ua => ua.UserId == userId);

                var totalXPFromAchievements = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId)
                    .Include(ua => ua.Achievement)
                    .SumAsync(ua => ua.Achievement.XPValue);

                var response = new UserResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    CreatedAt = user.CreatedAt,
                    ExperiencePoints = currentXP,
                    Level = user.Level,
                    Avatar = user.Avatar,
                    XpForNextLevel = xpForNextLevel,
                    LevelProgress = progress,
                    AchievementCount = achievementCount,
                    TotalXPFromAchievements = totalXPFromAchievements
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user profile");
                return StatusCode(500, new { error = "An error occurred while retrieving user profile." });
            }
        }

        [HttpPut("me/avatar")]
        [Authorize]
        public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found." });
            }

            user.Avatar = request.Avatar;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Avatar updated successfully" });
        }

        [HttpGet("me/xp-breakdown")]
        [Authorize]
        public async Task<IActionResult> GetXPBreakdown()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                var result = await _xpService.GetXPBreakdownAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving XP breakdown for user");
                return StatusCode(500, new { error = "An error occurred while retrieving XP breakdown data." });
            }
        }

        [HttpPost("me/seed-xp-history")]
        [Authorize]
        public async Task<IActionResult> SeedXPHistory()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in token." });
                }

                // Check if the user already has XP history records
                var existingHistory = await _context.XPHistory
                    .AnyAsync(x => x.UserId == userId);

                if (existingHistory)
                {
                    return BadRequest(new { message = "XP history has already been seeded for this user." });
                }

                var historyItems = new List<XPHistoryItem>();
                var timestamp = DateTime.UtcNow;

                // Seed XP for notes
                var notes = await _context.Notes
                    .Where(n => n.UserId == userId && !n.IsDeleted && !n.IsIdea)
                    .ToListAsync();

                foreach (var note in notes)
                {
                    historyItems.Add(new XPHistoryItem
                    {
                        UserId = userId,
                        Source = "Note",
                        Action = "Create",
                        Amount = XPValues.CreateNote,
                        ItemId = note.Id,
                        ItemTitle = note.Title,
                        CreatedAt = note.CreatedAt // Use original creation date
                    });
                }

                // Seed XP for ideas
                var ideas = await _context.Notes
                    .Where(n => n.UserId == userId && !n.IsDeleted && n.IsIdea)
                    .ToListAsync();

                foreach (var idea in ideas)
                {
                    historyItems.Add(new XPHistoryItem
                    {
                        UserId = userId,
                        Source = "Idea",
                        Action = "Create",
                        Amount = XPValues.CreateIdea,
                        ItemId = idea.Id,
                        ItemTitle = idea.Title,
                        CreatedAt = idea.CreatedAt // Use original creation date
                    });
                }

                // Seed XP for tasks
                var tasks = await _context.Tasks
                    .Where(t => t.UserId == userId && !t.IsDeleted)
                    .ToListAsync();

                foreach (var task in tasks)
                {
                    // XP for task creation
                    historyItems.Add(new XPHistoryItem
                    {
                        UserId = userId,
                        Source = "Task",
                        Action = "Create",
                        Amount = XPValues.CreateTask,
                        ItemId = task.Id,
                        ItemTitle = task.Title,
                        CreatedAt = task.CreatedAt // Use original creation date
                    });

                    // Additional XP for completed tasks
                    if (task.Status == Data.Entities.TaskStatus.Completed)
                    {
                        historyItems.Add(new XPHistoryItem
                        {
                            UserId = userId,
                            Source = "Task",
                            Action = "Complete",
                            Amount = XPValues.CompleteTask,
                            ItemId = task.Id,
                            ItemTitle = task.Title,
                            CreatedAt = task.UpdatedAt // Use update date for completion
                        });
                    }
                }

                // Seed XP for reminders
                var reminders = await _context.Reminders
                    .Where(r => r.UserId == userId && !r.IsDeleted)
                    .ToListAsync();

                foreach (var reminder in reminders)
                {
                    // XP for reminder creation
                    historyItems.Add(new XPHistoryItem
                    {
                        UserId = userId,
                        Source = "Reminder",
                        Action = "Create",
                        Amount = XPValues.CreateReminder,
                        ItemId = reminder.Id,
                        ItemTitle = reminder.Title,
                        CreatedAt = reminder.CreatedAt // Use original creation date
                    });

                    // Additional XP for completed reminders
                    if (reminder.IsCompleted)
                    {
                        historyItems.Add(new XPHistoryItem
                        {
                            UserId = userId,
                            Source = "Reminder",
                            Action = "Complete",
                            Amount = XPValues.CompleteReminder,
                            ItemId = reminder.Id,
                            ItemTitle = reminder.Title,
                            CreatedAt = reminder.CompletedAt ?? reminder.UpdatedAt // Use completion date if available
                        });
                    }
                }

                // Seed XP for links
                var noteLinks = await _context.NoteLinks
                    .Where(nl => nl.CreatedBy == userId && !nl.IsDeleted)
                    .ToListAsync();

                // Count unique pairs since links are stored bidirectionally
                var uniquePairs = new HashSet<string>();
                foreach (var link in noteLinks)
                {
                    var pair = link.NoteId.CompareTo(link.LinkedNoteId) < 0 
                        ? $"{link.NoteId}:{link.LinkedNoteId}" 
                        : $"{link.LinkedNoteId}:{link.NoteId}";
                    
                    if (uniquePairs.Add(pair))
                    {
                        historyItems.Add(new XPHistoryItem
                        {
                            UserId = userId,
                            Source = "Link",
                            Action = "Create",
                            Amount = XPValues.CreateLink,
                            ItemId = $"{link.NoteId}:{link.LinkedNoteId}", // Using composite key
                            ItemTitle = "Note Link",
                            CreatedAt = link.CreatedAt
                        });
                    }
                }

                // Add all history items
                await _context.XPHistory.AddRangeAsync(historyItems);
                await _context.SaveChangesAsync();

                // Return the result
                return Ok(new { 
                    message = "XP history seeded successfully", 
                    count = historyItems.Count,
                    totalXP = historyItems.Sum(x => x.Amount)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error seeding XP history for user");
                return StatusCode(500, new { error = "An error occurred while seeding XP history data." });
            }
        }
    }
}
