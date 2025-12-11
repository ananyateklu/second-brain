using System.Collections.Frozen;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Services.Git;

/// <summary>
/// Enforces repository access rules per user and configured roots.
/// </summary>
public class GitAuthorizationService : IGitAuthorizationService
{
    private readonly GitSettings _settings;
    private readonly ILogger<GitAuthorizationService> _logger;
    private readonly FrozenSet<string> _normalizedRoots;

    public GitAuthorizationService(
        IOptions<GitSettings> options,
        ILogger<GitAuthorizationService> logger)
    {
        _settings = options.Value ?? new GitSettings();
        _logger = logger;

        _normalizedRoots = (_settings.AllowedRepositoryRoots ?? [])
            .Where(root => !string.IsNullOrWhiteSpace(root))
            .Select(NormalizeRoot)
            .Where(root => root != null)
            .Select(root => root!)
            .ToFrozenSet(StringComparer.OrdinalIgnoreCase);
    }

    public Result<string> AuthorizeRepository(string repoPath, string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Result<string>.Failure("Unauthorized", "User id is required for repository access");
        }

        if (string.IsNullOrWhiteSpace(repoPath))
        {
            return Result<string>.Failure("InvalidPath", "Repository path is required");
        }

        if (_normalizedRoots.Count == 0)
        {
            _logger.LogWarning("Git access denied because no allowed roots are configured");
            return Result<string>.Failure("GitAccessNotConfigured",
                "Git access is disabled: configure Git:AllowedRepositoryRoots.");
        }

        // Normalize requested path and ensure it is absolute
        string normalizedRepoPath;
        try
        {
            normalizedRepoPath = Path.GetFullPath(repoPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to normalize repo path {RepoPath}", repoPath);
            return Result<string>.Failure("InvalidPath", "Repository path is invalid");
        }

        if (!Path.IsPathRooted(normalizedRepoPath))
        {
            return Result<string>.Failure("InvalidPath", "Repository path must be absolute");
        }

        var userSegment = SanitizeUserSegment(userId);

        foreach (var root in _normalizedRoots)
        {
            if (_settings.RequireUserScopedRoot)
            {
                var scopedRoot = NormalizeRoot(Path.Combine(root, userSegment));
                if (scopedRoot == null)
                {
                    continue;
                }

                if (IsSubPath(scopedRoot, normalizedRepoPath))
                {
                    return Result<string>.Success(normalizedRepoPath);
                }
            }
            else
            {
                if (IsSubPath(root, normalizedRepoPath))
                {
                    return Result<string>.Success(normalizedRepoPath);
                }
            }
        }

        _logger.LogWarning("User {UserId} attempted to access unauthorized repo path {RepoPath}", userId, repoPath);
        return Result<string>.Failure("UnauthorizedRepository",
            "You are not authorized to access this repository path.");
    }

    private static string? NormalizeRoot(string path)
    {
        try
        {
            var fullPath = Path.GetFullPath(path);
            return AppendSeparator(fullPath);
        }
        catch
        {
            return null;
        }
    }

    private static string AppendSeparator(string path)
    {
        var trimmed = path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return trimmed + Path.DirectorySeparatorChar;
    }

    private static bool IsSubPath(string rootWithSeparator, string candidatePath)
    {
        var normalizedCandidate = AppendSeparator(candidatePath);
        return normalizedCandidate.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase);
    }

    private static string SanitizeUserSegment(string userId)
    {
        var cleaned = new string(userId
            .Where(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.')
            .ToArray());

        if (!string.IsNullOrWhiteSpace(cleaned))
        {
            return cleaned;
        }

        // Use SHA256 for deterministic hash instead of GetHashCode()
        // GetHashCode() is randomized per process in .NET Core and would cause
        // inconsistent user paths across application restarts
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(userId));
        // Take first 8 bytes (64 bits) and convert to hex for a reasonably short but unique identifier
        var hashHex = Convert.ToHexString(hashBytes, 0, 8).ToLowerInvariant();
        return "user-" + hashHex;
    }
}
