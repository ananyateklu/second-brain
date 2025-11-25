namespace SecondBrain.API.Configuration;

/// <summary>
/// Configuration settings for JWT authentication
/// </summary>
public class JwtSettings
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// The secret key used to sign JWT tokens (must be at least 32 characters)
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// The issuer of the JWT token
    /// </summary>
    public string Issuer { get; set; } = "SecondBrain";

    /// <summary>
    /// The audience for the JWT token
    /// </summary>
    public string Audience { get; set; } = "SecondBrainUsers";

    /// <summary>
    /// The token expiry time in minutes
    /// </summary>
    public int ExpiryMinutes { get; set; } = 1440; // 24 hours
}

