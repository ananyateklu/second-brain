namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response containing authentication result and user information
/// </summary>
public class AuthResponse
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public string? Token { get; set; }
    public bool IsNewUser { get; set; }
}

/// <summary>
/// Response containing API key information
/// </summary>
public class ApiKeyResponse
{
    public string ApiKey { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
