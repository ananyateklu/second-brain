using System.Collections.Generic;

namespace SecondBrain.Application.Configuration;

/// <summary>
/// Settings for Git repository access control.
/// </summary>
public class GitSettings
{
    public const string SectionName = "Git";

    /// <summary>
    /// Absolute directory roots that repositories must reside under.
    /// </summary>
    public List<string> AllowedRepositoryRoots { get; init; } = [];

    /// <summary>
    /// When true, the repository path must be under a per-user subdirectory
    /// (root/{userIdSanitized}/...). Default is true to isolate users.
    /// </summary>
    public bool RequireUserScopedRoot { get; init; } = true;
}
