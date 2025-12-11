using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Git;

namespace SecondBrain.Tests.Unit.Application.Services.Git;

public class GitAuthorizationServiceTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly Mock<ILogger<GitAuthorizationService>> _loggerMock = new();

    public GitAuthorizationServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), "git-auth-" + Guid.NewGuid());
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void AuthorizeRepository_WhenNoAllowedRootsConfigured_Fails()
    {
        var sut = CreateService(new GitSettings { AllowedRepositoryRoots = [] });

        var result = sut.AuthorizeRepository(Path.Combine(_tempRoot, "user", "repo"), "user");

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("GitAccessNotConfigured");
    }

    [Fact]
    public void AuthorizeRepository_PathOutsideAllowedRoots_Fails()
    {
        var sut = CreateService(new GitSettings { AllowedRepositoryRoots = [_tempRoot] });
        var outsidePath = Path.Combine(Path.GetTempPath(), "other-root", "repo");

        var result = sut.AuthorizeRepository(outsidePath, "user1");

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("UnauthorizedRepository");
    }

    [Fact]
    public void AuthorizeRepository_WhenUserScopeRequired_RejectsOtherUserPath()
    {
        var sut = CreateService(new GitSettings
        {
            AllowedRepositoryRoots = [_tempRoot],
            RequireUserScopedRoot = true
        });

        var otherUserPath = Path.Combine(_tempRoot, "userB", "repo");

        var result = sut.AuthorizeRepository(otherUserPath, "userA");

        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("UnauthorizedRepository");
    }

    [Fact]
    public void AuthorizeRepository_ValidUserScopedPath_Succeeds()
    {
        var sut = CreateService(new GitSettings
        {
            AllowedRepositoryRoots = [_tempRoot],
            RequireUserScopedRoot = true
        });

        var repoPath = Path.Combine(_tempRoot, "userA", "repo");
        Directory.CreateDirectory(repoPath);

        var result = sut.AuthorizeRepository(repoPath, "userA");

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(Path.GetFullPath(repoPath));
    }

    private GitAuthorizationService CreateService(GitSettings settings)
    {
        return new GitAuthorizationService(Options.Create(settings), _loggerMock.Object);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempRoot))
            {
                Directory.Delete(_tempRoot, true);
            }
        }
        catch
        {
            // ignore cleanup errors in tests
        }
    }
}
