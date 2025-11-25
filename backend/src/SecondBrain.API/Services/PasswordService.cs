namespace SecondBrain.API.Services;

/// <summary>
/// Service for password hashing and verification using BCrypt
/// </summary>
public interface IPasswordService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public class PasswordService : IPasswordService
{
    private readonly ILogger<PasswordService> _logger;

    public PasswordService(ILogger<PasswordService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Hashes a password using BCrypt
    /// </summary>
    /// <param name="password">The plain text password to hash</param>
    /// <returns>The hashed password</returns>
    public string HashPassword(string password)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt(12));
        _logger.LogDebug("Password hashed successfully");
        return hash;
    }

    /// <summary>
    /// Verifies a password against a stored hash
    /// </summary>
    /// <param name="password">The plain text password to verify</param>
    /// <param name="passwordHash">The stored password hash</param>
    /// <returns>True if the password matches, false otherwise</returns>
    public bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            var isValid = BCrypt.Net.BCrypt.Verify(password, passwordHash);
            _logger.LogDebug("Password verification result: {IsValid}", isValid);
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error verifying password");
            return false;
        }
    }
}

