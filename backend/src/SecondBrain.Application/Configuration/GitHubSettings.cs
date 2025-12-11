namespace SecondBrain.Application.Configuration;

/// <summary>
/// Settings for GitHub API integration.
/// </summary>
public class GitHubSettings
{
    public const string SectionName = "GitHub";

    /// <summary>
    /// GitHub Personal Access Token for API authentication.
    /// Required scopes: repo, workflow, read:org (for private repos)
    /// </summary>
    public string? PersonalAccessToken { get; init; }

    /// <summary>
    /// Default repository owner (username or organization).
    /// </summary>
    public string? DefaultOwner { get; init; }

    /// <summary>
    /// Default repository name.
    /// </summary>
    public string? DefaultRepo { get; init; }

    /// <summary>
    /// API request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; init; } = 30;

    /// <summary>
    /// Base URL for GitHub API (can be changed for GitHub Enterprise).
    /// </summary>
    public string BaseUrl { get; init; } = "https://api.github.com";

    /// <summary>
    /// Enable caching of API responses.
    /// </summary>
    public bool EnableCaching { get; init; } = true;

    /// <summary>
    /// Cache duration in minutes for API responses.
    /// </summary>
    public int CacheDurationMinutes { get; init; } = 2;
}
