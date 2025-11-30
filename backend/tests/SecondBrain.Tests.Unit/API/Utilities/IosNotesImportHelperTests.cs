using System.Text.Json;
using Microsoft.AspNetCore.Http;
using SecondBrain.API.Utilities;

namespace SecondBrain.Tests.Unit.API.Utilities;

public class IosNotesImportHelperTests
{
    #region ExtractApiKeyFromHeader Tests

    [Fact]
    public void ExtractApiKeyFromHeader_WithValidBearerToken_ReturnsToken()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["Authorization"] = "Bearer test-api-key-12345";

        // Act
        var result = IosNotesImportHelper.ExtractApiKeyFromHeader(context.Request);

        // Assert
        result.Should().Be("test-api-key-12345");
    }

    [Fact]
    public void ExtractApiKeyFromHeader_WithLowercaseBearer_ReturnsToken()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["Authorization"] = "bearer test-api-key-12345";

        // Act
        var result = IosNotesImportHelper.ExtractApiKeyFromHeader(context.Request);

        // Assert
        result.Should().Be("test-api-key-12345");
    }

    [Fact]
    public void ExtractApiKeyFromHeader_WithMissingHeader_ReturnsNull()
    {
        // Arrange
        var context = new DefaultHttpContext();

        // Act
        var result = IosNotesImportHelper.ExtractApiKeyFromHeader(context.Request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ExtractApiKeyFromHeader_WithNonBearerAuth_ReturnsNull()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["Authorization"] = "Basic dXNlcjpwYXNz";

        // Act
        var result = IosNotesImportHelper.ExtractApiKeyFromHeader(context.Request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void ExtractApiKeyFromHeader_WithEmptyBearerToken_ReturnsEmptyString()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["Authorization"] = "Bearer ";

        // Act
        var result = IosNotesImportHelper.ExtractApiKeyFromHeader(context.Request);

        // Assert
        result.Should().Be(string.Empty);
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - Batch Format

    [Fact]
    public void NormalizeRequestToNoteList_WithBatchFormat_ParsesAllNotes()
    {
        // Arrange
        var json = @"{
            ""notes"": [
                { ""title"": ""Note 1"", ""body"": ""Content 1"" },
                { ""title"": ""Note 2"", ""body"": ""Content 2"" }
            ]
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(2);
        result[0].Title.Should().Be("Note 1");
        result[0].Content.Should().Be("Content 1");
        result[1].Title.Should().Be("Note 2");
        result[1].Content.Should().Be("Content 2");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithEmptyNotesArray_ReturnsEmptyList()
    {
        // Arrange
        var json = @"{ ""notes"": [] }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - Single Note Format

    [Fact]
    public void NormalizeRequestToNoteList_WithSingleNoteFormat_ParsesNote()
    {
        // Arrange
        var json = @"{
            ""title"": ""Single Note"",
            ""body"": ""Single content""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Title.Should().Be("Single Note");
        result[0].Content.Should().Be("Single content");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithContentField_ParsesContent()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with content field"",
            ""content"": ""Using content field""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("Using content field");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithMissingTitle_ReturnsEmptyList()
    {
        // Arrange
        var json = @"{ ""body"": ""Content without title"" }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - Date Parsing

    [Fact]
    public void NormalizeRequestToNoteList_WithRfc2822Date_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with RFC 2822 date"",
            ""createdOn"": ""Mon, 13 Jan 2025 18:28:35 -0600""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].CreatedAt.Should().BeCloseTo(
            new DateTimeOffset(2025, 1, 13, 18, 28, 35, TimeSpan.FromHours(-6)),
            TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithIso8601Date_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with ISO 8601 date"",
            ""createdOn"": ""2025-01-13T18:28:35-06:00""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].CreatedAt.Year.Should().Be(2025);
        result[0].CreatedAt.Month.Should().Be(1);
        result[0].CreatedAt.Day.Should().Be(13);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithCreatedAtField_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with created_at"",
            ""created_at"": ""2025-06-15T10:30:00Z""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].CreatedAt.Month.Should().Be(6);
        result[0].CreatedAt.Day.Should().Be(15);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithModifiedOnField_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with modifiedOn"",
            ""createdOn"": ""2025-01-01T00:00:00Z"",
            ""modifiedOn"": ""2025-01-15T12:00:00Z""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].UpdatedAt.Month.Should().Be(1);
        result[0].UpdatedAt.Day.Should().Be(15);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithUpdatedAtField_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with updated_at"",
            ""created_at"": ""2025-01-01T00:00:00Z"",
            ""updated_at"": ""2025-02-20T15:30:00Z""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].UpdatedAt.Month.Should().Be(2);
        result[0].UpdatedAt.Day.Should().Be(20);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithNoDate_UsesCurrentTime()
    {
        // Arrange
        var json = @"{ ""title"": ""Note without date"" }";
        var root = JsonDocument.Parse(json).RootElement;
        var beforeCall = DateTimeOffset.UtcNow;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);
        var afterCall = DateTimeOffset.UtcNow;

        // Assert
        result.Should().HaveCount(1);
        result[0].CreatedAt.Should().BeOnOrAfter(beforeCall);
        result[0].CreatedAt.Should().BeOnOrBefore(afterCall);
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - Tags

    [Fact]
    public void NormalizeRequestToNoteList_WithTagsAsString_ParsesTags()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with string tags"",
            ""tags"": ""tag1, tag2, tag3""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().HaveCount(3);
        result[0].Tags.Should().Contain("tag1");
        result[0].Tags.Should().Contain("tag2");
        result[0].Tags.Should().Contain("tag3");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithTagsAsArray_ParsesTags()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with array tags"",
            ""tags"": [""tag1"", ""tag2"", ""tag3""]
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().HaveCount(3);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithHashtagsInContent_ExtractsTags()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with hashtags"",
            ""body"": ""This is content with #important and #todo tags""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().Contain("important");
        result[0].Tags.Should().Contain("todo");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithTagsContainingHashPrefix_NormalizesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with hash prefixed tags"",
            ""tags"": ""#tag1, #tag2""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().Contain("tag1");
        result[0].Tags.Should().Contain("tag2");
        result[0].Tags.Should().NotContain("#tag1");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithDuplicateTags_DeduplicatesTags()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with duplicate tags"",
            ""tags"": ""Tag1, tag1, TAG1"",
            ""body"": ""Content with #tag1""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        // Tags should be deduplicated (case-insensitive)
        result[0].Tags.Should().HaveCount(1);
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithUnderscoreAndHyphenInTags_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with complex tags"",
            ""body"": ""Content with #my_tag and #my-other-tag""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().Contain("my_tag");
        result[0].Tags.Should().Contain("my-other-tag");
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - External ID

    [Fact]
    public void NormalizeRequestToNoteList_WithStringId_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with string ID"",
            ""id"": ""abc-123""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].ExternalId.Should().Be("abc-123");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithNumericId_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with numeric ID"",
            ""id"": 12345
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].ExternalId.Should().Be("12345");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithExternalIdField_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with external_id"",
            ""external_id"": ""ext-456""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].ExternalId.Should().Be("ext-456");
    }

    #endregion

    #region NormalizeRequestToNoteList Tests - Folder and Source

    [Fact]
    public void NormalizeRequestToNoteList_WithFolder_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with folder"",
            ""folder"": ""Work/Projects""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Folder.Should().Be("Work/Projects");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithSource_ParsesCorrectly()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with source"",
            ""source"": ""custom_source""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Source.Should().Be("custom_source");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithNoSource_DefaultsToIosNotes()
    {
        // Arrange
        var json = @"{ ""title"": ""Note without source"" }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Source.Should().Be("ios_notes");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void NormalizeRequestToNoteList_WithBatchContainingInvalidNotes_SkipsInvalidOnes()
    {
        // Arrange
        var json = @"{
            ""notes"": [
                { ""title"": ""Valid Note"", ""body"": ""Content"" },
                { ""body"": ""No title - invalid"" },
                { ""title"": ""Another Valid"", ""body"": ""More content"" }
            ]
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(2);
        result[0].Title.Should().Be("Valid Note");
        result[1].Title.Should().Be("Another Valid");
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithEmptyTags_ReturnsEmptyTagsList()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with empty tags"",
            ""tags"": """"
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().BeEmpty();
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithWhitespaceOnlyTags_ReturnsEmptyTagsList()
    {
        // Arrange
        var json = @"{
            ""title"": ""Note with whitespace tags"",
            ""tags"": ""   ,   ,   ""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        result[0].Tags.Should().BeEmpty();
    }

    [Fact]
    public void NormalizeRequestToNoteList_WithCompleteNote_ParsesAllFields()
    {
        // Arrange
        var json = @"{
            ""title"": ""Complete Note"",
            ""body"": ""Full content with #hashtag"",
            ""folder"": ""Personal"",
            ""source"": ""ios_notes"",
            ""id"": ""note-123"",
            ""tags"": [""explicit-tag""],
            ""createdOn"": ""2025-01-01T00:00:00Z"",
            ""modifiedOn"": ""2025-01-15T12:00:00Z""
        }";
        var root = JsonDocument.Parse(json).RootElement;

        // Act
        var result = IosNotesImportHelper.NormalizeRequestToNoteList(root);

        // Assert
        result.Should().HaveCount(1);
        var note = result[0];
        note.Title.Should().Be("Complete Note");
        note.Content.Should().Be("Full content with #hashtag");
        note.Folder.Should().Be("Personal");
        note.Source.Should().Be("ios_notes");
        note.ExternalId.Should().Be("note-123");
        note.Tags.Should().Contain("explicit-tag");
        note.Tags.Should().Contain("hashtag");
        note.CreatedAt.Year.Should().Be(2025);
        note.UpdatedAt.Day.Should().Be(15);
    }

    #endregion
}

