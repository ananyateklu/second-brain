using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.API;

/// <summary>
/// End-to-end integration tests for note versioning functionality.
/// Tests the complete lifecycle of notes from creation through multiple updates,
/// version history retrieval, version diff, and restore operations.
/// </summary>
[Collection("WebApplication")]
public class NoteVersioningApiTests : IAsyncLifetime
{
    private readonly WebApplicationFactoryFixture _factory;
    private HttpClient _client = null!;

    public NoteVersioningApiTests(WebApplicationFactoryFixture factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync()
    {
        _client = _factory.CreateAuthenticatedClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        await _factory.ResetDatabaseAsync();
        _client.Dispose();
    }

    #region Full Lifecycle Tests

    /// <summary>
    /// Tests the complete note lifecycle:
    /// Create (v1) → Update title (v2) → Update content (v3) → Update tags (v4) → Archive (v5)
    /// Verifies each version is properly tracked with source='web'.
    /// </summary>
    [Fact]
    public async Task WebNoteLifecycle_CreateAndMultipleUpdates_TracksAllVersionsCorrectly()
    {
        // Step 1: Create note (v1)
        var createRequest = new CreateNoteRequest
        {
            Title = "Version Test Note",
            Content = "Initial content for version testing",
            Tags = new List<string> { "test", "versioning" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdNote = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();
        createdNote.Should().NotBeNull();
        var noteId = createdNote!.Id;

        // Step 2: Update title (v2)
        var updateTitleRequest = new UpdateNoteRequest
        {
            Title = "Updated Title v2",
            Content = createdNote.Content,
            Tags = createdNote.Tags
        };
        var updateTitleResponse = await _client.PutAsJsonAsync($"/api/notes/{noteId}", updateTitleRequest);
        updateTitleResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Step 3: Update content (v3)
        var updateContentRequest = new UpdateNoteRequest
        {
            Title = "Updated Title v2",
            Content = "Updated content for version 3",
            Tags = createdNote.Tags
        };
        var updateContentResponse = await _client.PutAsJsonAsync($"/api/notes/{noteId}", updateContentRequest);
        updateContentResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Step 4: Update tags (v4)
        var updateTagsRequest = new UpdateNoteRequest
        {
            Title = "Updated Title v2",
            Content = "Updated content for version 3",
            Tags = new List<string> { "test", "versioning", "updated", "tags" }
        };
        var updateTagsResponse = await _client.PutAsJsonAsync($"/api/notes/{noteId}", updateTagsRequest);
        updateTagsResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Step 5: Archive (v5)
        var archiveRequest = new UpdateNoteRequest
        {
            Title = "Updated Title v2",
            Content = "Updated content for version 3",
            Tags = updateTagsRequest.Tags,
            IsArchived = true
        };
        var archiveResponse = await _client.PutAsJsonAsync($"/api/notes/{noteId}", archiveRequest);
        archiveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify version history
        var historyResponse = await _client.GetAsync($"/api/notes/{noteId}/versions");
        historyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history.Should().NotBeNull();
        history!.TotalVersions.Should().BeGreaterThanOrEqualTo(5);
        history.CurrentVersion.Should().BeGreaterThanOrEqualTo(5);
        history.Versions.Should().HaveCountGreaterThanOrEqualTo(5);

        // Verify all versions have source='web'
        foreach (var version in history.Versions)
        {
            version.Source.Should().Be("web", $"Version {version.VersionNumber} should have source='web'");
        }

        // Verify version 1 has initial content
        var v1 = history.Versions.FirstOrDefault(v => v.VersionNumber == 1);
        v1.Should().NotBeNull();
        v1!.Title.Should().Be("Version Test Note");
        v1.Content.Should().Be("Initial content for version testing");
    }

    /// <summary>
    /// Tests that creating a note results in version 1 with source='web' and correct initial content.
    /// </summary>
    [Fact]
    public async Task CreateNote_CreatesInitialVersion_WithSourceWeb()
    {
        // Arrange
        var request = new CreateNoteRequest
        {
            Title = "Initial Version Test",
            Content = "Testing that initial version is created correctly",
            Tags = new List<string> { "initial" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/notes", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var note = await response.Content.ReadFromJsonAsync<NoteResponse>();

        // Get version history
        var historyResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions");
        historyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Assert
        history.Should().NotBeNull();
        history!.TotalVersions.Should().Be(1);
        history.CurrentVersion.Should().Be(1);
        history.Versions.Should().HaveCount(1);

        var v1 = history.Versions.First();
        v1.VersionNumber.Should().Be(1);
        v1.Title.Should().Be("Initial Version Test");
        v1.Content.Should().Be("Testing that initial version is created correctly");
        v1.Tags.Should().BeEquivalentTo(new[] { "initial" });
        v1.Source.Should().Be("web");
        v1.IsCurrent.Should().BeTrue();
    }

    #endregion

    #region Version Diff Tests

    /// <summary>
    /// Tests that version diff correctly identifies title changes between two versions.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_TitleChange_IdentifiesTitleChanged()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Original Title",
            Content = "Same content",
            Tags = new List<string> { "tag1" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update title
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Changed Title",
            Content = "Same content",
            Tags = new List<string> { "tag1" }
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Get diff between v1 and v2
        var diffResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions/diff?fromVersion=1&toVersion=2");
        diffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var diffContent = await diffResponse.Content.ReadAsStringAsync();
        var diff = JsonSerializer.Deserialize<NoteVersionDiffResponse>(diffContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Assert
        diff.Should().NotBeNull();
        diff!.TitleChanged.Should().BeTrue();
        diff.ContentChanged.Should().BeFalse();
        diff.TagsChanged.Should().BeFalse();
        diff.FromVersion.Title.Should().Be("Original Title");
        diff.ToVersion.Title.Should().Be("Changed Title");
    }

    /// <summary>
    /// Tests that version diff correctly identifies content changes.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_ContentChange_IdentifiesContentChanged()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Same Title",
            Content = "Original content",
            Tags = new List<string> { "tag1" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update content
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Same Title",
            Content = "Changed content with more text",
            Tags = new List<string> { "tag1" }
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Get diff
        var diffResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions/diff?fromVersion=1&toVersion=2");
        diffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var diffContent = await diffResponse.Content.ReadAsStringAsync();
        var diff = JsonSerializer.Deserialize<NoteVersionDiffResponse>(diffContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Assert
        diff.Should().NotBeNull();
        diff!.TitleChanged.Should().BeFalse();
        diff.ContentChanged.Should().BeTrue();
        diff.FromVersion.Content.Should().Be("Original content");
        diff.ToVersion.Content.Should().Be("Changed content with more text");
    }

    /// <summary>
    /// Tests that version diff correctly identifies tag additions and removals.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_TagChanges_IdentifiesAddedAndRemovedTags()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Tag Test",
            Content = "Content",
            Tags = new List<string> { "tag1", "tag2", "common" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update tags
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Tag Test",
            Content = "Content",
            Tags = new List<string> { "tag3", "tag4", "common" }
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Get diff
        var diffResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions/diff?fromVersion=1&toVersion=2");
        diffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var diffContent = await diffResponse.Content.ReadAsStringAsync();
        var diff = JsonSerializer.Deserialize<NoteVersionDiffResponse>(diffContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Assert
        diff.Should().NotBeNull();
        diff!.TagsChanged.Should().BeTrue();
        diff.TagsAdded.Should().Contain("tag3");
        diff.TagsAdded.Should().Contain("tag4");
        diff.TagsRemoved.Should().Contain("tag1");
        diff.TagsRemoved.Should().Contain("tag2");
    }

    #endregion

    #region Version Restore Tests

    /// <summary>
    /// Tests restoring a note to a previous version.
    /// Verifies that a new version is created with restored content and source='restored'.
    /// </summary>
    [Fact]
    public async Task RestoreVersion_ToPreviousVersion_CreatesNewVersionWithRestoredContent()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Original Title v1",
            Content = "Original content v1",
            Tags = new List<string> { "original" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Make several updates
        var update1 = new UpdateNoteRequest { Title = "Changed Title v2", Content = "Changed content v2" };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", update1);

        var update2 = new UpdateNoteRequest { Title = "Changed Title v3", Content = "Changed content v3" };
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", update2);

        // Get current state before restore
        var beforeRestoreResponse = await _client.GetAsync($"/api/notes/{note.Id}");
        var beforeRestore = await beforeRestoreResponse.Content.ReadFromJsonAsync<NoteResponse>();
        beforeRestore!.Title.Should().Be("Changed Title v3");

        // Restore to version 1
        var restoreRequest = new { targetVersion = 1 };
        var restoreResponse = await _client.PostAsJsonAsync($"/api/notes/{note.Id}/versions/restore", restoreRequest);
        restoreResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify restored note content
        var afterRestoreResponse = await _client.GetAsync($"/api/notes/{note.Id}");
        afterRestoreResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var afterRestore = await afterRestoreResponse.Content.ReadFromJsonAsync<NoteResponse>();
        afterRestore!.Title.Should().Be("Original Title v1");
        afterRestore.Content.Should().Be("Original content v1");

        // Verify version history shows restore
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Should have 4 versions: v1 (original), v2, v3, v4 (restored)
        history!.TotalVersions.Should().BeGreaterThanOrEqualTo(4);

        // The latest version should have source='restored'
        var latestVersion = history.Versions.OrderByDescending(v => v.VersionNumber).First();
        latestVersion.Source.Should().Be("restored");
        latestVersion.ChangeSummary.Should().Contain("Restored");
    }

    #endregion

    #region Version At Time Tests

    /// <summary>
    /// Tests retrieving a note's state at a specific point in time.
    /// </summary>
    [Fact]
    public async Task GetVersionAtTime_ReturnsCorrectVersionState()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Time Travel Test",
            Content = "Initial content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Wait a moment to ensure timestamp separation
        await Task.Delay(100);

        // Get version history to find a timestamp
        var historyResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        var v1 = history!.Versions.First(v => v.VersionNumber == 1);
        var timestamp = Uri.EscapeDataString(v1.CreatedAt);

        // Get version at time
        var atTimeResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions/at?timestamp={timestamp}");
        atTimeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var atTimeContent = await atTimeResponse.Content.ReadAsStringAsync();
        var versionAtTime = JsonSerializer.Deserialize<NoteVersionResponse>(atTimeContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        versionAtTime.Should().NotBeNull();
        versionAtTime!.Title.Should().Be("Time Travel Test");
        versionAtTime.Content.Should().Be("Initial content");
    }

    #endregion

    #region Bulk Delete Version Tracking Tests

    /// <summary>
    /// Tests that bulk delete properly tracks version source (fixed bug).
    /// After fix, bulk delete should go through NoteOperationService with source='web'.
    /// </summary>
    [Fact]
    public async Task BulkDelete_WithMultipleNotes_DeletesAllNotes()
    {
        // Create multiple notes
        var noteIds = new List<string>();
        for (int i = 1; i <= 3; i++)
        {
            var request = new CreateNoteRequest
            {
                Title = $"Bulk Delete Test {i}",
                Content = $"Content {i}"
            };
            var response = await _client.PostAsJsonAsync("/api/notes", request);
            var note = await response.Content.ReadFromJsonAsync<NoteResponse>();
            noteIds.Add(note!.Id);
        }

        // Bulk delete
        var bulkDeleteRequest = new { noteIds };
        var deleteResponse = await _client.PostAsJsonAsync("/api/notes/bulk-delete", bulkDeleteRequest);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify all notes are deleted
        foreach (var noteId in noteIds)
        {
            var getResponse = await _client.GetAsync($"/api/notes/{noteId}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    #endregion

    #region Edge Cases

    /// <summary>
    /// Tests that updating a note with no actual changes doesn't create a new version.
    /// </summary>
    [Fact]
    public async Task UpdateNote_NoActualChanges_DoesNotCreateNewVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "No Changes Test",
            Content = "Content stays the same",
            Tags = new List<string> { "tag1" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created, "Note creation should succeed");
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();
        note.Should().NotBeNull("Note response should not be null");
        note!.Id.Should().NotBeNullOrEmpty("Note ID should not be empty");

        // Update with same values
        var updateRequest = new UpdateNoteRequest
        {
            Title = "No Changes Test",
            Content = "Content stays the same",
            Tags = new List<string> { "tag1" }
        };
        var updateResponse = await _client.PutAsJsonAsync($"/api/notes/{note.Id}", updateRequest);
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK, "Update should succeed");

        // Check version history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        historyResponse.StatusCode.Should().Be(HttpStatusCode.OK, "Version history should be retrievable");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        history.Should().NotBeNull("History response should not be null");

        // Should still only have 1 version
        history!.TotalVersions.Should().Be(1, $"Expected 1 version but got {history.TotalVersions}. Raw response: {historyContent}");
    }

    /// <summary>
    /// Tests that archived status changes create new versions.
    /// </summary>
    [Fact]
    public async Task UpdateNote_ArchiveStatusChange_CreatesNewVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Archive Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Archive the note
        var archiveRequest = new UpdateNoteRequest
        {
            Title = "Archive Test",
            Content = "Content",
            IsArchived = true
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", archiveRequest);

        // Check version history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history!.TotalVersions.Should().Be(2);
        var latestVersion = history.Versions.First(v => v.VersionNumber == 2);
        latestVersion.IsArchived.Should().BeTrue();
        latestVersion.ChangeSummary.Should().Contain("archived");
    }

    /// <summary>
    /// Tests that folder changes create new versions.
    /// </summary>
    [Fact]
    public async Task UpdateNote_FolderChange_CreatesNewVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Folder Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Move to folder
        var folderRequest = new UpdateNoteRequest
        {
            Title = "Folder Test",
            Content = "Content",
            Folder = "Work Projects",
            UpdateFolder = true  // Must explicitly indicate folder update
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", folderRequest);

        // Check version history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history!.TotalVersions.Should().Be(2);
        var latestVersion = history.Versions.First(v => v.VersionNumber == 2);
        latestVersion.Folder.Should().Be("Work Projects");
        latestVersion.ChangeSummary.Should().Contain("folder");
    }

    #endregion

    #region Error Handling Tests

    /// <summary>
    /// Tests that requesting version history for a non-existent note returns 404.
    /// </summary>
    [Fact]
    public async Task GetVersionHistory_NonExistentNote_ReturnsNotFound()
    {
        var response = await _client.GetAsync("/api/notes/non-existent-note-id/versions");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Tests that requesting a specific version that doesn't exist returns 404.
    /// </summary>
    [Fact]
    public async Task GetVersionByNumber_NonExistentVersion_ReturnsNotFound()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Version Error Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Request version 999 which doesn't exist
        var response = await _client.GetAsync($"/api/notes/{note!.Id}/versions/999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Tests that restoring to a non-existent version returns appropriate error.
    /// </summary>
    [Fact]
    public async Task RestoreVersion_NonExistentVersion_ReturnsNotFound()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Restore Error Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Try to restore to version 999
        var restoreRequest = new { targetVersion = 999 };
        var response = await _client.PostAsJsonAsync($"/api/notes/{note!.Id}/versions/restore", restoreRequest);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Tests that version diff with invalid version numbers returns 404.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_InvalidVersionNumbers_ReturnsNotFound()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Diff Error Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Request diff with non-existent version
        var response = await _client.GetAsync($"/api/notes/{note!.Id}/versions/diff?fromVersion=1&toVersion=999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Tests that restoring to a non-existent note returns 404.
    /// </summary>
    [Fact]
    public async Task RestoreVersion_NonExistentNote_ReturnsNotFound()
    {
        var restoreRequest = new { targetVersion = 1 };
        var response = await _client.PostAsJsonAsync("/api/notes/non-existent-note-id/versions/restore", restoreRequest);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Restore Edge Cases

    /// <summary>
    /// Tests restoring to the current version (should still create a new version with source='restored').
    /// </summary>
    [Fact]
    public async Task RestoreVersion_ToCurrentVersion_CreatesNewVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Restore Current Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Restore to version 1 (current)
        var restoreRequest = new { targetVersion = 1 };
        var restoreResponse = await _client.PostAsJsonAsync($"/api/notes/{note!.Id}/versions/restore", restoreRequest);
        restoreResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Should have 2 versions now
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history!.TotalVersions.Should().Be(2);
        var latestVersion = history.Versions.OrderByDescending(v => v.VersionNumber).First();
        latestVersion.Source.Should().Be("restored");
    }

    /// <summary>
    /// Tests multiple consecutive restores to different versions.
    /// </summary>
    [Fact]
    public async Task RestoreVersion_MultipleTimes_TracksAllRestores()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Multi Restore v1",
            Content = "Content v1"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update to v2
        var update1 = new UpdateNoteRequest { Title = "Multi Restore v2", Content = "Content v2" };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", update1);

        // Update to v3
        var update2 = new UpdateNoteRequest { Title = "Multi Restore v3", Content = "Content v3" };
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", update2);

        // Restore to v1 -> creates v4
        await _client.PostAsJsonAsync($"/api/notes/{note.Id}/versions/restore", new { targetVersion = 1 });

        // Restore to v2 -> creates v5
        await _client.PostAsJsonAsync($"/api/notes/{note.Id}/versions/restore", new { targetVersion = 2 });

        // Check history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history!.TotalVersions.Should().Be(5);

        // Verify v4 and v5 are both restored
        var restoredVersions = history.Versions.Where(v => v.Source == "restored").ToList();
        restoredVersions.Should().HaveCount(2);

        // Current note should have v2 content
        var noteResponse = await _client.GetAsync($"/api/notes/{note.Id}");
        var currentNote = await noteResponse.Content.ReadFromJsonAsync<NoteResponse>();
        currentNote!.Title.Should().Be("Multi Restore v2");
    }

    /// <summary>
    /// Tests that restoring preserves tags correctly.
    /// </summary>
    [Fact]
    public async Task RestoreVersion_PreservesTags()
    {
        // Create note with tags
        var createRequest = new CreateNoteRequest
        {
            Title = "Tag Restore Test",
            Content = "Content",
            Tags = new List<string> { "original", "tags" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update with different tags
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Tag Restore Test",
            Content = "Content",
            Tags = new List<string> { "new", "different", "tags" }
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Restore to v1
        await _client.PostAsJsonAsync($"/api/notes/{note.Id}/versions/restore", new { targetVersion = 1 });

        // Verify tags are restored
        var noteResponse = await _client.GetAsync($"/api/notes/{note.Id}");
        var currentNote = await noteResponse.Content.ReadFromJsonAsync<NoteResponse>();
        currentNote!.Tags.Should().BeEquivalentTo(new[] { "original", "tags" });
    }

    #endregion

    #region Version History Ordering and Pagination

    /// <summary>
    /// Tests that version history is returned in descending order (newest first).
    /// </summary>
    [Fact]
    public async Task GetVersionHistory_ReturnsNewestFirst()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Ordering Test v1",
            Content = "Content v1"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Create multiple versions
        for (int i = 2; i <= 5; i++)
        {
            var updateRequest = new UpdateNoteRequest
            {
                Title = $"Ordering Test v{i}",
                Content = $"Content v{i}"
            };
            await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);
        }

        // Get history
        var historyResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Verify ordering
        var versionNumbers = history!.Versions.Select(v => v.VersionNumber).ToList();
        versionNumbers.Should().BeInDescendingOrder();
        versionNumbers.First().Should().Be(5);
        versionNumbers.Last().Should().Be(1);
    }

    /// <summary>
    /// Tests that only the current version has IsCurrent=true.
    /// </summary>
    [Fact]
    public async Task GetVersionHistory_OnlyCurrentVersionMarkedAsCurrent()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Current Flag Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Create more versions
        for (int i = 0; i < 3; i++)
        {
            var updateRequest = new UpdateNoteRequest
            {
                Title = $"Current Flag Test {i}",
                Content = $"Content {i}"
            };
            await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);
        }

        // Get history
        var historyResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Only one version should be current
        var currentVersions = history!.Versions.Where(v => v.IsCurrent).ToList();
        currentVersions.Should().HaveCount(1);
        currentVersions.First().VersionNumber.Should().Be(history.CurrentVersion);
    }

    #endregion

    #region Archive/Unarchive Tests

    /// <summary>
    /// Tests the full archive and unarchive cycle creates proper versions.
    /// </summary>
    [Fact]
    public async Task UpdateNote_ArchiveThenUnarchive_CreatesTwoVersions()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Archive Cycle Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Archive
        var archiveRequest = new UpdateNoteRequest
        {
            Title = "Archive Cycle Test",
            Content = "Content",
            IsArchived = true
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", archiveRequest);

        // Unarchive
        var unarchiveRequest = new UpdateNoteRequest
        {
            Title = "Archive Cycle Test",
            Content = "Content",
            IsArchived = false
        };
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", unarchiveRequest);

        // Check history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        history!.TotalVersions.Should().Be(3);

        // v1 - not archived, v2 - archived, v3 - not archived
        var v1 = history.Versions.First(v => v.VersionNumber == 1);
        var v2 = history.Versions.First(v => v.VersionNumber == 2);
        var v3 = history.Versions.First(v => v.VersionNumber == 3);

        v1.IsArchived.Should().BeFalse();
        v2.IsArchived.Should().BeTrue();
        v2.ChangeSummary.Should().Contain("archived");
        v3.IsArchived.Should().BeFalse();
        v3.ChangeSummary.Should().Contain("unarchived");
    }

    #endregion

    #region Multiple Field Changes

    /// <summary>
    /// Tests that changing multiple fields in one update creates a single version with combined change summary.
    /// </summary>
    [Fact]
    public async Task UpdateNote_MultipleFieldChanges_CreatesSingleVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Original Title",
            Content = "Original content",
            Tags = new List<string> { "tag1" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update title, content, and tags in one request
        var updateRequest = new UpdateNoteRequest
        {
            Title = "New Title",
            Content = "New content",
            Tags = new List<string> { "tag2", "tag3" }
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Check history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Should have exactly 2 versions
        history!.TotalVersions.Should().Be(2);

        var v2 = history.Versions.First(v => v.VersionNumber == 2);
        v2.Title.Should().Be("New Title");
        v2.Content.Should().Be("New content");
        v2.Tags.Should().BeEquivalentTo(new[] { "tag2", "tag3" });

        // Change summary should mention multiple changes
        v2.ChangeSummary.Should().NotBeNullOrEmpty();
    }

    /// <summary>
    /// Tests getting a specific version by number returns correct data.
    /// </summary>
    [Fact]
    public async Task GetVersionByNumber_ReturnsCorrectVersion()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Version Number Test v1",
            Content = "Content v1"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update to create v2
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Version Number Test v2",
            Content = "Content v2"
        };
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", updateRequest);

        // Get v1 specifically
        var v1Response = await _client.GetAsync($"/api/notes/{note.Id}/versions/1");
        v1Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var v1Content = await v1Response.Content.ReadAsStringAsync();
        var v1 = JsonSerializer.Deserialize<NoteVersionResponse>(v1Content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        v1!.Title.Should().Be("Version Number Test v1");
        v1.Content.Should().Be("Content v1");
        v1.VersionNumber.Should().Be(1);

        // Get v2 specifically
        var v2Response = await _client.GetAsync($"/api/notes/{note.Id}/versions/2");
        v2Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var v2Content = await v2Response.Content.ReadAsStringAsync();
        var v2 = JsonSerializer.Deserialize<NoteVersionResponse>(v2Content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        v2!.Title.Should().Be("Version Number Test v2");
        v2.Content.Should().Be("Content v2");
        v2.VersionNumber.Should().Be(2);
    }

    #endregion

    #region Diff Edge Cases

    /// <summary>
    /// Tests that diff between same version numbers returns appropriate response.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_SameVersionNumbers_ShowsNoChanges()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Same Version Diff Test",
            Content = "Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Get diff between v1 and v1
        var diffResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions/diff?fromVersion=1&toVersion=1");
        diffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var diffContent = await diffResponse.Content.ReadAsStringAsync();
        var diff = JsonSerializer.Deserialize<NoteVersionDiffResponse>(diffContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // No changes should be detected
        diff!.TitleChanged.Should().BeFalse();
        diff.ContentChanged.Should().BeFalse();
        diff.TagsChanged.Should().BeFalse();
        diff.ArchivedChanged.Should().BeFalse();
        diff.FolderChanged.Should().BeFalse();
    }

    /// <summary>
    /// Tests diff between non-consecutive versions.
    /// </summary>
    [Fact]
    public async Task GetVersionDiff_NonConsecutiveVersions_ShowsAllChanges()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Original Title",
            Content = "Original content",
            Tags = new List<string> { "original" }
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Update title (v2)
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", new UpdateNoteRequest
        {
            Title = "Changed Title",
            Content = "Original content",
            Tags = new List<string> { "original" }
        });

        // Update content (v3)
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", new UpdateNoteRequest
        {
            Title = "Changed Title",
            Content = "Changed content",
            Tags = new List<string> { "original" }
        });

        // Update tags (v4)
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", new UpdateNoteRequest
        {
            Title = "Changed Title",
            Content = "Changed content",
            Tags = new List<string> { "changed" }
        });

        // Get diff between v1 and v4 (skipping v2 and v3)
        var diffResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions/diff?fromVersion=1&toVersion=4");
        diffResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var diffContent = await diffResponse.Content.ReadAsStringAsync();
        var diff = JsonSerializer.Deserialize<NoteVersionDiffResponse>(diffContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // All changes should be detected
        diff!.TitleChanged.Should().BeTrue();
        diff.ContentChanged.Should().BeTrue();
        diff.TagsChanged.Should().BeTrue();
        diff.TagsAdded.Should().Contain("changed");
        diff.TagsRemoved.Should().Contain("original");
    }

    #endregion

    #region Timestamp Validation

    /// <summary>
    /// Tests that version timestamps are properly ordered.
    /// </summary>
    [Fact]
    public async Task GetVersionHistory_TimestampsAreChronological()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Timestamp Test v1",
            Content = "Content v1"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Wait a bit to ensure timestamp separation
        await Task.Delay(50);

        // Update
        await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", new UpdateNoteRequest
        {
            Title = "Timestamp Test v2",
            Content = "Content v2"
        });

        await Task.Delay(50);

        // Update again
        await _client.PutAsJsonAsync($"/api/notes/{note.Id}", new UpdateNoteRequest
        {
            Title = "Timestamp Test v3",
            Content = "Content v3"
        });

        // Get history
        var historyResponse = await _client.GetAsync($"/api/notes/{note.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Parse timestamps and verify order
        var v1 = history!.Versions.First(v => v.VersionNumber == 1);
        var v2 = history.Versions.First(v => v.VersionNumber == 2);
        var v3 = history.Versions.First(v => v.VersionNumber == 3);

        DateTime.Parse(v1.CreatedAt).Should().BeBefore(DateTime.Parse(v2.CreatedAt));
        DateTime.Parse(v2.CreatedAt).Should().BeBefore(DateTime.Parse(v3.CreatedAt));
    }

    /// <summary>
    /// Tests that ValidFrom timestamps form non-overlapping ranges.
    /// </summary>
    [Fact]
    public async Task GetVersionHistory_ValidPeriodsAreNonOverlapping()
    {
        // Create note
        var createRequest = new CreateNoteRequest
        {
            Title = "Valid Period Test v1",
            Content = "Content v1"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var note = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Create more versions
        for (int i = 2; i <= 4; i++)
        {
            await Task.Delay(50);
            await _client.PutAsJsonAsync($"/api/notes/{note!.Id}", new UpdateNoteRequest
            {
                Title = $"Valid Period Test v{i}",
                Content = $"Content v{i}"
            });
        }

        // Get history
        var historyResponse = await _client.GetAsync($"/api/notes/{note!.Id}/versions");
        var historyContent = await historyResponse.Content.ReadAsStringAsync();
        var history = JsonSerializer.Deserialize<NoteVersionHistoryResponse>(historyContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Only the current version should have null ValidTo
        var versionsWithNullValidTo = history!.Versions.Where(v => v.ValidTo == null).ToList();
        versionsWithNullValidTo.Should().HaveCount(1);
        versionsWithNullValidTo.First().IsCurrent.Should().BeTrue();

        // All non-current versions should have ValidTo set
        var nonCurrentVersions = history.Versions.Where(v => !v.IsCurrent).ToList();
        foreach (var v in nonCurrentVersions)
        {
            v.ValidTo.Should().NotBeNull($"Version {v.VersionNumber} should have ValidTo set");
        }
    }

    #endregion
}

#region Response DTOs for Deserialization

/// <summary>
/// Response DTO for version history endpoint.
/// </summary>
public class NoteVersionHistoryResponse
{
    public string NoteId { get; set; } = string.Empty;
    public int TotalVersions { get; set; }
    public int CurrentVersion { get; set; }
    public List<NoteVersionResponse> Versions { get; set; } = new();
}

/// <summary>
/// Response DTO for a single note version.
/// </summary>
public class NoteVersionResponse
{
    public string NoteId { get; set; } = string.Empty;
    public int VersionNumber { get; set; }
    public bool IsCurrent { get; set; }
    public string ValidFrom { get; set; } = string.Empty;
    public string? ValidTo { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
    public string? Folder { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public string? ChangeSummary { get; set; }
    public string Source { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for version diff endpoint.
/// </summary>
public class NoteVersionDiffResponse
{
    public string NoteId { get; set; } = string.Empty;
    public NoteVersionResponse FromVersion { get; set; } = new();
    public NoteVersionResponse ToVersion { get; set; } = new();
    public bool TitleChanged { get; set; }
    public bool ContentChanged { get; set; }
    public bool TagsChanged { get; set; }
    public bool ArchivedChanged { get; set; }
    public bool FolderChanged { get; set; }
    public List<string> TagsAdded { get; set; } = new();
    public List<string> TagsRemoved { get; set; } = new();
}

#endregion
