using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.Git;

/// <summary>
/// Authorizes access to Git repositories based on configuration and user identity.
/// </summary>
public interface IGitAuthorizationService
{
    /// <summary>
    /// Validate that the user is allowed to access the requested repository path.
    /// Returns a normalized path on success.
    /// </summary>
    /// <param name="repoPath">Absolute path to the repository.</param>
    /// <param name="userId">Authenticated user id.</param>
    /// <returns>Normalized path if authorized, or an error result.</returns>
    Result<string> AuthorizeRepository(string repoPath, string userId);
}
