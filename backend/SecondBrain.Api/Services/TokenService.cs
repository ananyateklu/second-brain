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
using System.Threading.Tasks;
using SecondBrain.Data;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Configuration;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Api.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly DataContext _context;
        private readonly ILogger<TokenService> _logger;

        public TokenService(IOptions<JwtSettings> jwtSettings, DataContext context, ILogger<TokenService> logger)
        {
            _jwtSettings = jwtSettings.Value;
            _context = context;
            _logger = logger;
        }

        public async Task<TokenResponse> GenerateTokensAsync(User user)
        {
            _logger.LogInformation("Generating tokens for user {UserId}", user.Id);

            if (string.IsNullOrEmpty(_jwtSettings.Secret))
            {
                _logger.LogError("JWT Secret is missing.");
                throw new InvalidOperationException("Invalid or missing Secret in configuration.");
            }

            if (_jwtSettings.AccessTokenExpirationMinutes <= 0)
            {
                _logger.LogError("Invalid AccessTokenExpirationMinutes: {Expiration}", _jwtSettings.AccessTokenExpirationMinutes);
                throw new InvalidOperationException("Invalid AccessTokenExpirationMinutes in configuration.");
            }

            if (_jwtSettings.RefreshTokenExpirationDays <= 0)
            {
                _logger.LogError("Invalid RefreshTokenExpirationDays: {Expiration}", _jwtSettings.RefreshTokenExpirationDays);
                throw new InvalidOperationException("Invalid RefreshTokenExpirationDays in configuration.");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

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

            // Save Refresh Token to Database
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

            _logger.LogInformation("Tokens generated successfully for user {UserId}", user.Id);

            return new TokenResponse
            {
                AccessToken = accessTokenString,
                RefreshToken = refreshToken,
                User = new UserResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    CreatedAt = user.CreatedAt
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

        private string GenerateRefreshToken()
        {
            return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        }
    }
}
