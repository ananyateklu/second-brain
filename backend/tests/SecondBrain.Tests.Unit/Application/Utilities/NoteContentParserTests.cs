using SecondBrain.Application.Utilities;

namespace SecondBrain.Tests.Unit.Application.Utilities;

public class NoteContentParserTests
{
    #region Basic Parsing Tests

    [Fact]
    public void Parse_WithNullInput_ReturnsEmptyResult()
    {
        // Act
        var result = NoteContentParser.Parse(null);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().BeNull();
        result.Tags.Should().BeNull();
        result.CreatedDate.Should().BeNull();
        result.UpdatedDate.Should().BeNull();
        result.Content.Should().BeEmpty();
    }

    [Fact]
    public void Parse_WithEmptyString_ReturnsEmptyResult()
    {
        // Act
        var result = NoteContentParser.Parse("");

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().BeEmpty();
    }

    [Fact]
    public void Parse_WithWhitespaceOnly_ReturnsEmptyResult()
    {
        // Act
        var result = NoteContentParser.Parse("   \n\t   ");

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().BeEmpty();
    }

    #endregion

    #region Title Parsing Tests

    [Fact]
    public void Parse_WithTitle_ExtractsTitle()
    {
        // Arrange
        var content = "Title: My Test Note\nContent:\nSome content here";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("My Test Note");
    }

    [Fact]
    public void Parse_WithTitleWithExtraSpaces_TrimsTitle()
    {
        // Arrange
        var content = "Title:   Spaced Title   \nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("Spaced Title");
    }

    [Fact]
    public void Parse_WithEmptyTitle_ReturnsEmptyTitle()
    {
        // Arrange
        var content = "Title: \nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().BeEmpty();
    }

    [Fact]
    public void Parse_WithNoTitle_ReturnsNullTitle()
    {
        // Arrange
        var content = "Content:\nJust some content";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().BeNull();
    }

    [Fact]
    public void Parse_WithTitleContainingSpecialChars_ExtractsCorrectly()
    {
        // Arrange
        var content = "Title: My Note: With Colon & Special Chars!\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("My Note: With Colon & Special Chars!");
    }

    #endregion

    #region Tags Parsing Tests

    [Fact]
    public void Parse_WithTags_ExtractsTags()
    {
        // Arrange
        var content = "Tags: tag1, tag2, tag3\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().HaveCount(3);
        result.Tags.Should().Contain("tag1");
        result.Tags.Should().Contain("tag2");
        result.Tags.Should().Contain("tag3");
    }

    [Fact]
    public void Parse_WithTagsNoSpaces_ExtractsTags()
    {
        // Arrange
        var content = "Tags: tag1,tag2,tag3\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().HaveCount(3);
    }

    [Fact]
    public void Parse_WithTagsExtraSpaces_TrimsTags()
    {
        // Arrange
        var content = "Tags:   tag1  ,  tag2  ,  tag3  \nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().HaveCount(3);
        result.Tags.Should().Contain("tag1");
        result.Tags.Should().Contain("tag2");
        result.Tags.Should().Contain("tag3");
    }

    [Fact]
    public void Parse_WithSingleTag_ExtractsTag()
    {
        // Arrange
        var content = "Tags: singleTag\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().HaveCount(1);
        result.Tags.Should().Contain("singleTag");
    }

    [Fact]
    public void Parse_WithEmptyTags_ReturnsEmptyList()
    {
        // Arrange
        var content = "Tags: \nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().BeEmpty();
    }

    [Fact]
    public void Parse_WithNoTags_ReturnsNullTags()
    {
        // Arrange
        var content = "Content:\nJust content";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Tags.Should().BeNull();
    }

    #endregion

    #region Date Parsing Tests

    [Fact]
    public void Parse_WithCreatedDate_ExtractsDate()
    {
        // Arrange
        var content = "Created: 2025-01-15T10:30:00Z\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.CreatedDate.Should().NotBeNull();
        result.CreatedDate!.Value.Year.Should().Be(2025);
        result.CreatedDate.Value.Month.Should().Be(1);
        result.CreatedDate.Value.Day.Should().Be(15);
    }

    [Fact]
    public void Parse_WithLastUpdatedDate_ExtractsDate()
    {
        // Arrange
        var content = "Last Updated: 2025-06-20T15:45:00Z\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.UpdatedDate.Should().NotBeNull();
        result.UpdatedDate!.Value.Year.Should().Be(2025);
        result.UpdatedDate.Value.Month.Should().Be(6);
        result.UpdatedDate.Value.Day.Should().Be(20);
    }

    [Fact]
    public void Parse_WithBothDates_ExtractsBoth()
    {
        // Arrange
        var content = "Created: 2025-01-01T00:00:00\nLast Updated: 2025-02-15T12:00:00\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.CreatedDate.Should().NotBeNull();
        result.UpdatedDate.Should().NotBeNull();
        // Just verify dates are parsed, not specific values due to timezone handling
        result.CreatedDate.Should().HaveValue();
        result.UpdatedDate.Should().HaveValue();
    }

    [Fact]
    public void Parse_WithInvalidDate_ReturnsNullDate()
    {
        // Arrange
        var content = "Created: invalid-date\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.CreatedDate.Should().BeNull();
    }

    [Fact]
    public void Parse_WithEmptyCreatedDate_ReturnsNullDate()
    {
        // Arrange
        var content = "Created: \nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.CreatedDate.Should().BeNull();
    }

    [Fact]
    public void Parse_WithVariousDateFormats_ParsesCorrectly()
    {
        // Arrange - Simple ISO 8601 format without timezone
        var content = "Created: 2025-01-15T10:30:00\nContent:\nBody";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.CreatedDate.Should().NotBeNull();
        result.CreatedDate.Should().HaveValue();
    }

    #endregion

    #region Content Parsing Tests

    [Fact]
    public void Parse_WithContentSection_ExtractsContent()
    {
        // Arrange
        var content = "Title: Test\nContent:\nThis is the actual content";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().Be("This is the actual content");
    }

    [Fact]
    public void Parse_WithMultilineContent_ExtractsAll()
    {
        // Arrange
        var content = "Title: Test\nContent:\nLine 1\nLine 2\nLine 3";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().Contain("Line 1");
        result.Content.Should().Contain("Line 2");
        result.Content.Should().Contain("Line 3");
    }

    [Fact]
    public void Parse_ContentWithEmptyLines_SkipsEmptyLines()
    {
        // Arrange
        var content = "Title: Test\nContent:\n\nLine 1\n\nLine 2\n\n";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().NotStartWith("\n");
        result.Content.Should().Contain("Line 1");
        result.Content.Should().Contain("Line 2");
    }

    [Fact]
    public void Parse_ContentTrimsWhitespace_FromResult()
    {
        // Arrange
        var content = "Title: Test\nContent:\n  Trimmed content  ";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().Be("Trimmed content");
    }

    [Fact]
    public void Parse_WithNoContentSection_ReturnsEmptyContent()
    {
        // Arrange
        var content = "Title: Test\nTags: tag1";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().BeEmpty();
    }

    #endregion

    #region Full Document Parsing Tests

    [Fact]
    public void Parse_WithCompleteDocument_ExtractsAllFields()
    {
        // Arrange
        var content = @"Title: Complete Note
Tags: important, work, project
Created: 2025-01-10T09:00:00Z
Last Updated: 2025-01-15T17:30:00Z
Content:
This is the main content.
It spans multiple lines.
And has all metadata.";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("Complete Note");
        result.Tags.Should().HaveCount(3);
        result.Tags.Should().Contain("important");
        result.Tags.Should().Contain("work");
        result.Tags.Should().Contain("project");
        result.CreatedDate.Should().NotBeNull();
        result.UpdatedDate.Should().NotBeNull();
        result.Content.Should().Contain("This is the main content.");
        result.Content.Should().Contain("multiple lines");
    }

    [Fact]
    public void Parse_WithReorderedFields_ExtractsCorrectly()
    {
        // Arrange
        var content = @"Tags: first
Title: Second
Last Updated: 2025-01-15T00:00:00Z
Created: 2025-01-01T00:00:00Z
Content:
Body text";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("Second");
        result.Tags.Should().Contain("first");
        result.CreatedDate.Should().NotBeNull();
        result.UpdatedDate.Should().NotBeNull();
        result.Content.Should().Be("Body text");
    }

    [Fact]
    public void Parse_WithOnlyContent_ExtractsContent()
    {
        // Arrange
        var content = @"Content:
Just the content, nothing else.
Multiple lines too.";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().BeNull();
        result.Tags.Should().BeNull();
        result.CreatedDate.Should().BeNull();
        result.UpdatedDate.Should().BeNull();
        result.Content.Should().Contain("Just the content");
    }

    #endregion

    #region Edge Cases Tests

    [Fact]
    public void Parse_WithColonInContent_HandlesCorrectly()
    {
        // Arrange
        var content = "Title: Test\nContent:\nTime: 10:30 AM - Meeting";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Content.Should().Be("Time: 10:30 AM - Meeting");
    }

    [Fact]
    public void Parse_WithSpecialCharacters_HandlesCorrectly()
    {
        // Arrange
        var content = "Title: Test <>&'\"\nTags: c#, .net\nContent:\nCode: Console.WriteLine(\"Hello\");";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("Test <>&'\"");
        result.Tags.Should().Contain("c#");
        result.Tags.Should().Contain(".net");
    }

    [Fact]
    public void Parse_WithUnicodeCharacters_HandlesCorrectly()
    {
        // Arrange
        var content = "Title: Unicode: 日本語 🎉\nTags: emoji, 日本語\nContent:\nContent with emoji 🚀";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Contain("日本語");
        result.Title.Should().Contain("🎉");
        result.Content.Should().Contain("🚀");
    }

    [Fact]
    public void Parse_WithWindowsLineEndings_HandlesCorrectly()
    {
        // Arrange
        var content = "Title: Test\r\nTags: tag1, tag2\r\nContent:\r\nBody content";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().Be("Test");
        result.Tags.Should().HaveCount(2);
    }

    [Fact]
    public void Parse_WithMixedLineEndings_HandlesCorrectly()
    {
        // Arrange
        var content = "Title: Test\nTags: tag1\r\nContent:\rBody content";

        // Act
        var result = NoteContentParser.Parse(content);

        // Assert
        result.Title.Should().NotBeNull();
    }

    #endregion

    #region ParsedNoteContent Class Tests

    [Fact]
    public void ParsedNoteContent_DefaultValues_AreCorrect()
    {
        // Act
        var content = new ParsedNoteContent();

        // Assert
        content.Title.Should().BeNull();
        content.Tags.Should().BeNull();
        content.CreatedDate.Should().BeNull();
        content.UpdatedDate.Should().BeNull();
        content.Content.Should().BeEmpty();
    }

    [Fact]
    public void ParsedNoteContent_CanSetAllProperties()
    {
        // Arrange & Act
        var now = DateTime.UtcNow;
        var content = new ParsedNoteContent
        {
            Title = "Test Title",
            Tags = new List<string> { "tag1", "tag2" },
            CreatedDate = now,
            UpdatedDate = now.AddDays(1),
            Content = "Test Content"
        };

        // Assert
        content.Title.Should().Be("Test Title");
        content.Tags.Should().HaveCount(2);
        content.CreatedDate.Should().Be(now);
        content.UpdatedDate.Should().Be(now.AddDays(1));
        content.Content.Should().Be("Test Content");
    }

    #endregion
}

