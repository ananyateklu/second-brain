using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;

namespace SecondBrain.Tests.Unit.Application.Services.Git;

/// <summary>
/// Unit tests for GitService.
/// Tests validation logic, parsing functions, and error handling.
///
/// Note: Methods that require a real git repository for full testing are covered
/// in integration tests. These unit tests focus on input validation and early
/// failure paths that don't require actual git operations.
/// </summary>
public class GitServiceTests
{
    private readonly Mock<ILogger<GitService>> _mockLogger;
    private readonly GitService _sut;

    public GitServiceTests()
    {
        _mockLogger = new Mock<ILogger<GitService>>();
        _sut = new GitService(_mockLogger.Object);
    }

    #region ValidateRepositoryAsync Tests

    [Fact]
    public async Task ValidateRepositoryAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.ValidateRepositoryAsync("");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
        result.Error.Message.Should().Contain("required");
    }

    [Fact]
    public async Task ValidateRepositoryAsync_WithWhitespacePath_ReturnsFailure()
    {
        // Act
        var result = await _sut.ValidateRepositoryAsync("   ");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task ValidateRepositoryAsync_WithRelativePath_ReturnsFailure()
    {
        // Act
        var result = await _sut.ValidateRepositoryAsync("./relative/path");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
        result.Error.Message.Should().Contain("absolute");
    }

    [Fact]
    public async Task ValidateRepositoryAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.ValidateRepositoryAsync(nonExistentPath);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    [Fact]
    public async Task ValidateRepositoryAsync_WithDirectoryWithoutGit_ReturnsFailure()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act
            var result = await _sut.ValidateRepositoryAsync(tempDir);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidRepository");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    #endregion

    #region StageFilesAsync Tests - Path Validation (Fast Path)

    [Fact]
    public async Task StageFilesAsync_WithEmptyFilesArray_ReturnsFailure()
    {
        // Arrange - use existing directory
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act - empty files array fails before repo validation
            var result = await _sut.StageFilesAsync(tempDir, []);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("NoFiles");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    [Fact]
    public async Task StageFilesAsync_WithInvalidFilePaths_ReturnsFailure()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act - paths with command injection attempts fail before repo validation
            var result = await _sut.StageFilesAsync(tempDir, ["; rm -rf /", "| cat /etc/passwd"]);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidPaths");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    [Fact]
    public async Task StageFilesAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.StageFilesAsync("", ["file.txt"]);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task StageFilesAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.StageFilesAsync(nonExistentPath, ["file.txt"]);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region UnstageFilesAsync Tests - Path Validation (Fast Path)

    [Fact]
    public async Task UnstageFilesAsync_WithEmptyFilesArray_ReturnsFailure()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act - empty files array fails before repo validation
            var result = await _sut.UnstageFilesAsync(tempDir, []);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("NoFiles");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    [Fact]
    public async Task UnstageFilesAsync_WithPathTraversal_ReturnsFailure()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act - path traversal attempt fails before repo validation
            var result = await _sut.UnstageFilesAsync(tempDir, ["../../../etc/passwd"]);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidPaths");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    [Fact]
    public async Task UnstageFilesAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.UnstageFilesAsync("", ["file.txt"]);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    #endregion

    #region CommitAsync Tests - Input Validation

    [Fact]
    public async Task CommitAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act - empty path fails before message validation
        var result = await _sut.CommitAsync("", "message");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task CommitAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.CommitAsync(nonExistentPath, "message");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    [Fact]
    public async Task CommitAsync_WithDirectoryWithoutGit_FailsRepoValidation()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act - directory exists but no .git, so repo validation fails
            var result = await _sut.CommitAsync(tempDir, "message");

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidRepository");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    #endregion

    #region GetLogAsync Tests

    [Fact]
    public async Task GetLogAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.GetLogAsync("", 20);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task GetLogAsync_WithDirectoryWithoutGit_FailsRepoValidation()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act with any count
            var result = await _sut.GetLogAsync(tempDir, 50);

            // Assert - should fail due to missing .git
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidRepository");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    #endregion

    #region GetStatusAsync Tests

    [Fact]
    public async Task GetStatusAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.GetStatusAsync("");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task GetStatusAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.GetStatusAsync(nonExistentPath);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    [Fact]
    public async Task GetStatusAsync_WithDirectoryWithoutGit_FailsRepoValidation()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act
            var result = await _sut.GetStatusAsync(tempDir);

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidRepository");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    #endregion

    #region GetDiffAsync Tests

    [Fact]
    public async Task GetDiffAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.GetDiffAsync("", "file.txt");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task GetDiffAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.GetDiffAsync(nonExistentPath, "file.txt");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region DiscardChangesAsync Tests

    [Fact]
    public async Task DiscardChangesAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.DiscardChangesAsync("", "file.txt");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task DiscardChangesAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.DiscardChangesAsync(nonExistentPath, "file.txt");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region GetBranchesAsync Tests

    [Fact]
    public async Task GetBranchesAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.GetBranchesAsync("");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task GetBranchesAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.GetBranchesAsync(nonExistentPath);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region SwitchBranchAsync Tests

    [Fact]
    public async Task SwitchBranchAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.SwitchBranchAsync("", "main");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task SwitchBranchAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.SwitchBranchAsync(nonExistentPath, "main");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    [Fact]
    public async Task SwitchBranchAsync_WithDirectoryWithoutGit_FailsRepoValidation()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        try
        {
            // Act
            var result = await _sut.SwitchBranchAsync(tempDir, "main");

            // Assert
            result.IsFailure.Should().BeTrue();
            result.Error!.Code.Should().Be("InvalidRepository");
        }
        finally
        {
            Directory.Delete(tempDir);
        }
    }

    #endregion

    #region CreateBranchAsync Tests

    [Fact]
    public async Task CreateBranchAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.CreateBranchAsync("", "new-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task CreateBranchAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.CreateBranchAsync(nonExistentPath, "new-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region DeleteBranchAsync Tests

    [Fact]
    public async Task DeleteBranchAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.DeleteBranchAsync("", "old-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task DeleteBranchAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.DeleteBranchAsync(nonExistentPath, "old-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region MergeBranchAsync Tests

    [Fact]
    public async Task MergeBranchAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.MergeBranchAsync("", "feature-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task MergeBranchAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.MergeBranchAsync(nonExistentPath, "feature-branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region PushAsync Tests

    [Fact]
    public async Task PushAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.PushAsync("");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task PushAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.PushAsync(nonExistentPath);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region PullAsync Tests

    [Fact]
    public async Task PullAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.PullAsync("");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task PullAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.PullAsync(nonExistentPath);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion

    #region PublishBranchAsync Tests

    [Fact]
    public async Task PublishBranchAsync_WithEmptyPath_ReturnsFailure()
    {
        // Act
        var result = await _sut.PublishBranchAsync("", "branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("InvalidPath");
    }

    [Fact]
    public async Task PublishBranchAsync_WithNonExistentPath_ReturnsFailure()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        // Act
        var result = await _sut.PublishBranchAsync(nonExistentPath, "branch");

        // Assert
        result.IsFailure.Should().BeTrue();
        result.Error!.Code.Should().Be("PathNotFound");
    }

    #endregion
}
