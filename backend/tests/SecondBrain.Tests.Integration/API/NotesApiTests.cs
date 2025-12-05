using System.Net;
using System.Net.Http.Json;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.API;

/// <summary>
/// Integration tests for the Notes API endpoints.
/// </summary>
[Collection("WebApplication")]
public class NotesApiTests : IAsyncLifetime
{
    private readonly WebApplicationFactoryFixture _factory;
    private HttpClient _client = null!;

    public NotesApiTests(WebApplicationFactoryFixture factory)
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

    [Fact]
    public async Task GetAllNotes_WithNoNotes_ReturnsEmptyList()
    {
        // Act
        var response = await _client.GetAsync("/api/notes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await response.Content.ReadFromJsonAsync<List<NoteResponse>>();
        notes.Should().NotBeNull();
        notes.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateNote_WithValidRequest_ReturnsCreatedNote()
    {
        // Arrange
        var request = new CreateNoteRequest
        {
            Title = "Test Note",
            Content = "This is a test note content.",
            Tags = new List<string> { "test", "integration" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/notes", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var note = await response.Content.ReadFromJsonAsync<NoteResponse>();
        note.Should().NotBeNull();
        note!.Title.Should().Be("Test Note");
        note.Content.Should().Be("This is a test note content.");
        note.Tags.Should().BeEquivalentTo(new[] { "test", "integration" });
        note.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateNote_WithEmptyTitle_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateNoteRequest
        {
            Title = "",
            Content = "Content without title"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/notes", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetNoteById_WithExistingNote_ReturnsNote()
    {
        // Arrange
        var createRequest = new CreateNoteRequest
        {
            Title = "Note to retrieve",
            Content = "Content to retrieve"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var createdNote = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Act
        var response = await _client.GetAsync($"/api/notes/{createdNote!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await response.Content.ReadFromJsonAsync<NoteResponse>();
        note.Should().NotBeNull();
        note!.Id.Should().Be(createdNote.Id);
        note.Title.Should().Be("Note to retrieve");
    }

    [Fact]
    public async Task GetNoteById_WithNonExistentId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/notes/non-existent-id");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateNote_WithValidRequest_ReturnsUpdatedNote()
    {
        // Arrange
        var createRequest = new CreateNoteRequest
        {
            Title = "Original Title",
            Content = "Original Content"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var createdNote = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        var updateRequest = new UpdateNoteRequest
        {
            Title = "Updated Title",
            Content = "Updated Content",
            Tags = new List<string> { "updated" }
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/api/notes/{createdNote!.Id}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var note = await response.Content.ReadFromJsonAsync<NoteResponse>();
        note.Should().NotBeNull();
        note!.Title.Should().Be("Updated Title");
        note.Content.Should().Be("Updated Content");
        note.Tags.Should().Contain("updated");
    }

    [Fact]
    public async Task DeleteNote_WithExistingNote_ReturnsNoContent()
    {
        // Arrange
        var createRequest = new CreateNoteRequest
        {
            Title = "Note to delete",
            Content = "Content to delete"
        };
        var createResponse = await _client.PostAsJsonAsync("/api/notes", createRequest);
        var createdNote = await createResponse.Content.ReadFromJsonAsync<NoteResponse>();

        // Act
        var response = await _client.DeleteAsync($"/api/notes/{createdNote!.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify deletion
        var getResponse = await _client.GetAsync($"/api/notes/{createdNote.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllNotes_WithMultipleNotes_ReturnsAllNotes()
    {
        // Arrange
        for (int i = 1; i <= 3; i++)
        {
            var request = new CreateNoteRequest
            {
                Title = $"Note {i}",
                Content = $"Content {i}"
            };
            await _client.PostAsJsonAsync("/api/notes", request);
        }

        // Act
        var response = await _client.GetAsync("/api/notes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await response.Content.ReadFromJsonAsync<List<NoteResponse>>();
        notes.Should().NotBeNull();
        notes.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllNotes_WithVersionedRoute_ReturnsNotes()
    {
        // Arrange
        var createRequest = new CreateNoteRequest
        {
            Title = "Versioned Note",
            Content = "Testing versioned API"
        };
        await _client.PostAsJsonAsync("/api/notes", createRequest);

        // Act - Test versioned route
        var response = await _client.GetAsync("/api/v1/notes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var notes = await response.Content.ReadFromJsonAsync<List<NoteResponse>>();
        notes.Should().NotBeNull();
        notes.Should().HaveCount(1);
    }

    [Fact]
    public async Task Notes_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange - Use client without auth
        using var unauthenticatedClient = _factory.CreateClient();

        // Act
        var response = await unauthenticatedClient.GetAsync("/api/notes");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
