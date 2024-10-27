using Microsoft.AspNetCore.Mvc;
using SecondBrain.Api.DTOs.Auth;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using BCrypt.Net;
using SecondBrain.Api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace SecondBrain.Api.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(DataContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Validate the request
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password) || string.IsNullOrEmpty(request.Name))
            {
                return BadRequest(new { error = "Name, Email, and Password are required." });
            }

            // Check if the user already exists
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return Conflict(new { error = "User with this email already exists." });
            }

            // Hash the password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Create a new user
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = request.Email,
                PasswordHash = passwordHash,
                Name = request.Name,
                CreatedAt = DateTime.UtcNow
            };

            // Save the user to the database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Generate JWT tokens using the TokenService
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
            // Retrieve the user ID from the JWT claims
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token." });
            }

            // Fetch the user from the database
            var user = await _context.Users
                .AsNoTracking() // Improves performance since we're only reading data
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound(new { error = "User not found." });
            }

            // Map the user entity to a DTO to avoid exposing sensitive information
            var userResponse = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                CreatedAt = user.CreatedAt
                // Include other non-sensitive fields as needed
            };

            return Ok(userResponse);
        }
    }
}
