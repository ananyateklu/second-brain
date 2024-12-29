// SecondBrain.Api/Services/TokenService.cs
using SecondBrain.Data.Entities;
using SecondBrain.Api.DTOs.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Claims;
using System.Security.Cryptography;
using SecondBrain.Data;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Configuration;
using SecondBrain.Api.Gamification;

namespace SecondBrain.Api.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly DataContext _context;
        private readonly ILogger<TokenService> _logger;
        private readonly IXPService _xpService;

        public TokenService(
            IOptions<JwtSettings> jwtSettings,
            DataContext context,
            ILogger<TokenService> logger,
            IXPService xpService)
        {
            _jwtSettings = jwtSettings.Value;
            _context = context;
            _logger = logger;
            _xpService = xpService;
        }

        public async Task<TokenResponse> GenerateTokensAsync(User user)
        {
            if (user == null)
            {
                throw new ArgumentNullException(nameof(user), "User cannot be null.");
            }

            _logger.LogInformation("Generating tokens for user {UserId}", user.Id);

            if (string.IsNullOrWhiteSpace(_jwtSettings.Secret))
            {
                _logger.LogError("JWT Secret is missing or invalid");
                throw new InvalidOperationException("JWT Secret is missing or invalid");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            _logger.LogInformation("JWT Email claim type: {EmailClaimType}", JwtRegisteredClaimNames.Email);

            // Add level and XP claims
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim("email", user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("level", user.Level.ToString()),
                new Claim("xp", user.ExperiencePoints.ToString())
            };

            // Debug: Log all claims
            foreach (var claim in claims)
            {
                _logger.LogInformation("Adding claim: Type = {ClaimType}, Value = {ClaimValue}", claim.Type, claim.Value);
            }

            var accessToken = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
                signingCredentials: creds
            );

            var accessTokenString = new JwtSecurityTokenHandler().WriteToken(accessToken);

            // Generate Refresh Token
            var refreshToken = GenerateRefreshToken();
            var refreshTokenEntity = new RefreshToken
            {
                Id = $"rt_{Guid.NewGuid()}",
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow,
                UserId = user.Id
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            // Get level progress
            var (_, xpForNextLevel, progress) = await _xpService.GetLevelProgressAsync(user.Id);

            return new TokenResponse
            {
                AccessToken = accessTokenString,
                RefreshToken = refreshToken,
                User = new UserResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    CreatedAt = user.CreatedAt,
                    ExperiencePoints = user.ExperiencePoints,
                    Level = user.Level,
                    Avatar = user.Avatar,
                    XpForNextLevel = xpForNextLevel,
                    LevelProgress = progress
                }
            };
        }

        public async Task<TokenResponse> RefreshTokensAsync(string refreshToken)
        {
            _logger.LogInformation("Refreshing tokens using refresh token {RefreshToken}", refreshToken);

            var refreshTokenEntity = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow);

            if (refreshTokenEntity == null)
            {
                _logger.LogWarning("Invalid or expired refresh token {RefreshToken}", refreshToken);
                throw new SecurityTokenException("Invalid or expired refresh token.");
            }

            // Revoke the old refresh token
            refreshTokenEntity.IsRevoked = true;
            _context.RefreshTokens.Update(refreshTokenEntity);

            // Generate new tokens
            var newTokens = await GenerateTokensAsync(refreshTokenEntity.User);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Tokens refreshed successfully for user {UserId}", refreshTokenEntity.User.Id);

            return newTokens;
        }

        private static string GenerateRefreshToken()
        {
            return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        }
    }
}
