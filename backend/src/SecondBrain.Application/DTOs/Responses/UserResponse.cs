namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model containing user data (without sensitive information)
/// </summary>
public sealed class UserResponse
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

