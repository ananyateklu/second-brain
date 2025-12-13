using System.Security.Claims;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.Auth;

/// <summary>
/// Service for JWT token generation and validation
/// </summary>
public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}
