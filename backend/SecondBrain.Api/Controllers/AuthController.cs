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

        public AuthController(
            DataContext context, 
            ITokenService tokenService,
            IXPService xpService)
        {
            _context = context;
            _tokenService = tokenService;
            _xpService = xpService;
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
                    ExperiencePoints = user.ExperiencePoints,
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
    }
}
