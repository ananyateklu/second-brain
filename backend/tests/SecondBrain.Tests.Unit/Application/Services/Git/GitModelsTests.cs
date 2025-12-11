using SecondBrain.Application.Services.Git.Models;

namespace SecondBrain.Tests.Unit.Application.Services.Git;

/// <summary>
/// Unit tests for Git model classes.
/// Tests computed properties, default values, and status descriptions.
/// </summary>
public class GitModelsTests
{
    #region GitStatus Tests

    [Fact]
    public void GitStatus_DefaultValues_AreCorrect()
    {
        // Act
        var status = new GitStatus();

        // Assert
        status.Branch.Should().BeEmpty();
        status.HasRemote.Should().BeFalse();
        status.RemoteName.Should().BeNull();
        status.Ahead.Should().Be(0);
        status.Behind.Should().Be(0);
        status.StagedChanges.Should().BeEmpty();
        status.UnstagedChanges.Should().BeEmpty();
        status.UntrackedFiles.Should().BeEmpty();
    }

    [Fact]
    public void GitStatus_HasChanges_ReturnsTrueWhenStagedChangesExist()
    {
        // Arrange
        var status = new GitStatus
        {
            StagedChanges = [new GitFileChange { FilePath = "file.txt", Status = "M" }]
        };

        // Assert
        status.HasChanges.Should().BeTrue();
    }

    [Fact]
    public void GitStatus_HasChanges_ReturnsTrueWhenUnstagedChangesExist()
    {
        // Arrange
        var status = new GitStatus
        {
            UnstagedChanges = [new GitFileChange { FilePath = "file.txt", Status = "M" }]
        };

        // Assert
        status.HasChanges.Should().BeTrue();
    }

    [Fact]
    public void GitStatus_HasChanges_ReturnsTrueWhenUntrackedFilesExist()
    {
        // Arrange
        var status = new GitStatus
        {
            UntrackedFiles = [new GitFileChange { FilePath = "new-file.txt", Status = "?" }]
        };

        // Assert
        status.HasChanges.Should().BeTrue();
    }

    [Fact]
    public void GitStatus_HasChanges_ReturnsFalseWhenNoChanges()
    {
        // Arrange
        var status = new GitStatus();

        // Assert
        status.HasChanges.Should().BeFalse();
    }

    [Fact]
    public void GitStatus_HasStagedChanges_ReturnsTrueWhenStagedChangesExist()
    {
        // Arrange
        var status = new GitStatus
        {
            StagedChanges = [new GitFileChange { FilePath = "file.txt", Status = "A" }]
        };

        // Assert
        status.HasStagedChanges.Should().BeTrue();
    }

    [Fact]
    public void GitStatus_HasStagedChanges_ReturnsFalseWhenNoStagedChanges()
    {
        // Arrange
        var status = new GitStatus
        {
            UnstagedChanges = [new GitFileChange { FilePath = "file.txt", Status = "M" }]
        };

        // Assert
        status.HasStagedChanges.Should().BeFalse();
    }

    [Fact]
    public void GitStatus_TotalChanges_ReturnsCorrectSum()
    {
        // Arrange
        var status = new GitStatus
        {
            StagedChanges =
            [
                new GitFileChange { FilePath = "staged1.txt" },
                new GitFileChange { FilePath = "staged2.txt" }
            ],
            UnstagedChanges =
            [
                new GitFileChange { FilePath = "unstaged1.txt" }
            ],
            UntrackedFiles =
            [
                new GitFileChange { FilePath = "untracked1.txt" },
                new GitFileChange { FilePath = "untracked2.txt" },
                new GitFileChange { FilePath = "untracked3.txt" }
            ]
        };

        // Assert
        status.TotalChanges.Should().Be(6); // 2 + 1 + 3
    }

    #endregion

    #region GitFileChange Tests

    [Theory]
    [InlineData("M", "Modified")]
    [InlineData("A", "Added")]
    [InlineData("D", "Deleted")]
    [InlineData("R", "Renamed")]
    [InlineData("C", "Copied")]
    [InlineData("?", "Untracked")]
    [InlineData("U", "Unmerged")]
    [InlineData("X", "Unknown")]
    [InlineData("", "Unknown")]
    public void GitFileChange_StatusDescription_ReturnsCorrectDescription(string status, string expectedDescription)
    {
        // Arrange
        var fileChange = new GitFileChange { Status = status };

        // Assert
        fileChange.StatusDescription.Should().Be(expectedDescription);
    }

    [Fact]
    public void GitFileChange_DefaultValues_AreCorrect()
    {
        // Act
        var fileChange = new GitFileChange();

        // Assert
        fileChange.FilePath.Should().BeEmpty();
        fileChange.Status.Should().BeEmpty();
        fileChange.OldPath.Should().BeNull();
    }

    [Fact]
    public void GitFileChange_OldPath_CanBeSetForRenames()
    {
        // Arrange
        var fileChange = new GitFileChange
        {
            FilePath = "new-name.txt",
            Status = "R",
            OldPath = "old-name.txt"
        };

        // Assert
        fileChange.OldPath.Should().Be("old-name.txt");
        fileChange.StatusDescription.Should().Be("Renamed");
    }

    #endregion

    #region GitOperationResult Tests

    [Fact]
    public void GitOperationResult_DefaultValues_AreCorrect()
    {
        // Act
        var result = new GitOperationResult();

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().BeEmpty();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void GitOperationResult_CanRepresentSuccess()
    {
        // Arrange
        var result = new GitOperationResult
        {
            Success = true,
            Message = "Push successful"
        };

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Push successful");
        result.Error.Should().BeNull();
    }

    [Fact]
    public void GitOperationResult_CanRepresentFailure()
    {
        // Arrange
        var result = new GitOperationResult
        {
            Success = false,
            Message = "",
            Error = "Authentication failed"
        };

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be("Authentication failed");
    }

    #endregion

    #region GitDiffResult Tests

    [Fact]
    public void GitDiffResult_DefaultValues_AreCorrect()
    {
        // Act
        var result = new GitDiffResult();

        // Assert
        result.FilePath.Should().BeEmpty();
        result.Diff.Should().BeEmpty();
        result.Additions.Should().Be(0);
        result.Deletions.Should().Be(0);
    }

    [Fact]
    public void GitDiffResult_CanStoreAdditionsAndDeletions()
    {
        // Arrange
        var result = new GitDiffResult
        {
            FilePath = "test.cs",
            Diff = "+line1\n+line2\n-oldline",
            Additions = 2,
            Deletions = 1
        };

        // Assert
        result.Additions.Should().Be(2);
        result.Deletions.Should().Be(1);
    }

    #endregion

    #region GitLogEntry Tests

    [Fact]
    public void GitLogEntry_DefaultValues_AreCorrect()
    {
        // Act
        var entry = new GitLogEntry();

        // Assert
        entry.Hash.Should().BeEmpty();
        entry.ShortHash.Should().BeEmpty();
        entry.Message.Should().BeEmpty();
        entry.Author.Should().BeEmpty();
        entry.AuthorEmail.Should().BeEmpty();
        entry.Date.Should().BeEmpty();
    }

    [Fact]
    public void GitLogEntry_DateParsed_ReturnsDateTimeForValidDate()
    {
        // Arrange
        var entry = new GitLogEntry
        {
            Date = "2024-01-15T10:30:00+00:00"
        };

        // Assert
        entry.DateParsed.Should().NotBeNull();
        entry.DateParsed!.Value.Year.Should().Be(2024);
        entry.DateParsed.Value.Month.Should().Be(1);
        entry.DateParsed.Value.Day.Should().Be(15);
    }

    [Fact]
    public void GitLogEntry_DateParsed_ReturnsNullForInvalidDate()
    {
        // Arrange
        var entry = new GitLogEntry
        {
            Date = "not-a-date"
        };

        // Assert
        entry.DateParsed.Should().BeNull();
    }

    [Fact]
    public void GitLogEntry_DateParsed_ReturnsNullForEmptyDate()
    {
        // Arrange
        var entry = new GitLogEntry();

        // Assert
        entry.DateParsed.Should().BeNull();
    }

    #endregion

    #region GitBranch Tests

    [Fact]
    public void GitBranch_DefaultValues_AreCorrect()
    {
        // Act
        var branch = new GitBranch();

        // Assert
        branch.Name.Should().BeEmpty();
        branch.IsCurrent.Should().BeFalse();
        branch.IsRemote.Should().BeFalse();
        branch.RemoteName.Should().BeNull();
        branch.Upstream.Should().BeNull();
        branch.LastCommitHash.Should().BeNull();
        branch.LastCommitMessage.Should().BeNull();
    }

    [Fact]
    public void GitBranch_CanRepresentLocalBranch()
    {
        // Arrange
        var branch = new GitBranch
        {
            Name = "feature/new-feature",
            IsCurrent = true,
            IsRemote = false,
            Upstream = "origin/feature/new-feature",
            LastCommitHash = "abc1234",
            LastCommitMessage = "Add new feature"
        };

        // Assert
        branch.IsCurrent.Should().BeTrue();
        branch.IsRemote.Should().BeFalse();
        branch.Upstream.Should().Be("origin/feature/new-feature");
    }

    [Fact]
    public void GitBranch_CanRepresentRemoteBranch()
    {
        // Arrange
        var branch = new GitBranch
        {
            Name = "origin/main",
            IsCurrent = false,
            IsRemote = true,
            RemoteName = "origin"
        };

        // Assert
        branch.IsRemote.Should().BeTrue();
        branch.RemoteName.Should().Be("origin");
    }

    #endregion

    #region Request DTOs Tests

    [Fact]
    public void GitStageRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitStageRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.Files.Should().BeEmpty();
    }

    [Fact]
    public void GitUnstageRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitUnstageRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.Files.Should().BeEmpty();
    }

    [Fact]
    public void GitCommitRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitCommitRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.Message.Should().BeEmpty();
    }

    [Fact]
    public void GitRemoteRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitRemoteRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.Remote.Should().BeNull();
        request.Branch.Should().BeNull();
    }

    [Fact]
    public void GitDiffRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitDiffRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.FilePath.Should().BeEmpty();
        request.Staged.Should().BeFalse();
    }

    [Fact]
    public void GitLogRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitLogRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.Count.Should().Be(20);
    }

    [Fact]
    public void GitSwitchBranchRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitSwitchBranchRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.BranchName.Should().BeEmpty();
    }

    [Fact]
    public void GitCreateBranchRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitCreateBranchRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.BranchName.Should().BeEmpty();
        request.SwitchToNewBranch.Should().BeTrue();
        request.BaseBranch.Should().BeNull();
    }

    [Fact]
    public void GitDeleteBranchRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitDeleteBranchRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.BranchName.Should().BeEmpty();
        request.Force.Should().BeFalse();
    }

    [Fact]
    public void GitMergeBranchRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitMergeBranchRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.BranchName.Should().BeEmpty();
        request.Message.Should().BeNull();
    }

    [Fact]
    public void GitPublishBranchRequest_DefaultValues_AreCorrect()
    {
        // Act
        var request = new GitPublishBranchRequest();

        // Assert
        request.RepoPath.Should().BeEmpty();
        request.BranchName.Should().BeEmpty();
        request.Remote.Should().BeNull();
    }

    #endregion
}
