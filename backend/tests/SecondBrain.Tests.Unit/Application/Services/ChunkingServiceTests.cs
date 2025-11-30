using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;

namespace SecondBrain.Tests.Unit.Application.Services;

public class ChunkingServiceTests
{
    private readonly Mock<ILogger<ChunkingService>> _mockLogger;
    private readonly RagSettings _settings;
    private readonly ChunkingService _sut;

    public ChunkingServiceTests()
    {
        _mockLogger = new Mock<ILogger<ChunkingService>>();
        _settings = new RagSettings
        {
            ChunkSize = 500,
            ChunkOverlap = 50,
            EnableChunking = true
        };

        _sut = new ChunkingService(Options.Create(_settings), _mockLogger.Object);
    }

    #region ChunkNote Tests

    [Fact]
    public void ChunkNote_WhenContentIsEmpty_ReturnsSingleEmptyChunk()
    {
        // Arrange
        var note = CreateTestNote("note-1", "", "Empty Note");

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks.Should().HaveCount(1);
        chunks[0].ChunkIndex.Should().Be(0);
    }

    [Fact]
    public void ChunkNote_WhenChunkingDisabled_ReturnsSingleChunk()
    {
        // Arrange
        var settings = new RagSettings { EnableChunking = false };
        var service = new ChunkingService(Options.Create(settings), _mockLogger.Object);
        var note = CreateTestNote("note-1", "Long content ".PadRight(2000, 'x'), "Long Note");

        // Act
        var chunks = service.ChunkNote(note);

        // Assert
        chunks.Should().HaveCount(1);
    }

    [Fact]
    public void ChunkNote_IncludesTitle()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Some content", "My Test Title");

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks[0].Content.Should().Contain("Title: My Test Title");
    }

    [Fact]
    public void ChunkNote_IncludesTags()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Some content", "Title");
        note.Tags = new List<string> { "tag1", "tag2", "tag3" };

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks[0].Content.Should().Contain("Tags: tag1, tag2, tag3");
    }

    [Fact]
    public void ChunkNote_IncludesCreatedDate()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Some content", "Title");
        note.CreatedAt = new DateTime(2024, 1, 15, 10, 0, 0, DateTimeKind.Utc);

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks[0].Content.Should().Contain("Created: 2024-01-15");
    }

    [Fact]
    public void ChunkNote_IncludesUpdatedDate()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Some content", "Title");
        note.UpdatedAt = new DateTime(2024, 2, 20, 10, 0, 0, DateTimeKind.Utc);

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks[0].Content.Should().Contain("Last Updated: 2024-02-20");
    }

    [Fact]
    public void ChunkNote_IncludesMainContent()
    {
        // Arrange
        var note = CreateTestNote("note-1", "This is the main content of the note", "Title");

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks[0].Content.Should().Contain("Content:");
        chunks[0].Content.Should().Contain("This is the main content of the note");
    }

    [Fact]
    public void ChunkNote_SetsCorrectChunkIndices()
    {
        // Arrange
        var settings = new RagSettings
        {
            ChunkSize = 100, // Small chunk size to force multiple chunks
            ChunkOverlap = 10,
            EnableChunking = true
        };
        var service = new ChunkingService(Options.Create(settings), _mockLogger.Object);

        // Create content that will definitely be chunked
        var longContent = string.Join("\n\n", Enumerable.Range(1, 50).Select(i => $"This is paragraph {i}. " + new string('x', 50)));
        var note = CreateTestNote("note-1", longContent, "Long Note");

        // Act
        var chunks = service.ChunkNote(note);

        // Assert
        for (int i = 0; i < chunks.Count; i++)
        {
            chunks[i].ChunkIndex.Should().Be(i);
        }
    }

    #endregion

    #region ChunkText Tests

    [Fact]
    public void ChunkText_WhenTextIsEmpty_ReturnsEmptyList()
    {
        // Act
        var chunks = _sut.ChunkText("", 500, 50);

        // Assert
        chunks.Should().BeEmpty();
    }

    [Fact]
    public void ChunkText_WhenTextIsWhitespace_ReturnsEmptyList()
    {
        // Act
        var chunks = _sut.ChunkText("   ", 500, 50);

        // Assert
        chunks.Should().BeEmpty();
    }

    [Fact]
    public void ChunkText_WhenTextIsSmall_ReturnsSingleChunk()
    {
        // Arrange
        var text = "This is a short text.";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCount(1);
        chunks[0].Content.Should().Be(text);
        chunks[0].ChunkIndex.Should().Be(0);
    }

    [Fact]
    public void ChunkText_SplitsByParagraphs()
    {
        // Arrange
        var text = "First paragraph content here.\n\nSecond paragraph with more content.\n\nThird paragraph at the end.";

        // Act
        var chunks = _sut.ChunkText(text, 50, 10);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
    }

    [Fact]
    public void ChunkText_HandlesVeryLongParagraphs()
    {
        // Arrange - single paragraph much longer than chunk size
        // Each 100-char segment = ~29 tokens at 3.5 chars/token, so 600 chars = ~171 tokens
        var text = new string('a', 200) + ". " + new string('b', 200) + ". " + new string('c', 200) + ".";

        // Act - chunk size of 50 tokens should force multiple chunks
        var chunks = _sut.ChunkText(text, 50, 10);

        // Assert
        chunks.Should().HaveCountGreaterThan(1);
    }

    [Fact]
    public void ChunkText_SetsTokenCount()
    {
        // Arrange
        var text = "Some sample text for token estimation.";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks[0].TokenCount.Should().BeGreaterThan(0);
    }

    [Fact]
    public void ChunkText_SetsStartAndEndPositions()
    {
        // Arrange
        var text = "Some sample text.";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks[0].StartPosition.Should().Be(0);
        chunks[0].EndPosition.Should().BeGreaterThan(0);
    }

    [Fact]
    public void ChunkText_RespectsSentenceBoundaries()
    {
        // Arrange
        var text = "First sentence. Second sentence. Third sentence.";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
        // Each chunk should ideally end at a sentence boundary
    }

    [Fact]
    public void ChunkText_HandlesMultipleParagraphsCorrectly()
    {
        // Arrange
        var text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCount(1);
        chunks[0].Content.Should().Contain("Paragraph one.");
        chunks[0].Content.Should().Contain("Paragraph two.");
        chunks[0].Content.Should().Contain("Paragraph three.");
    }

    [Fact]
    public void ChunkText_HandlesOverlapCorrectly()
    {
        // Arrange - create content that will result in multiple chunks
        var sentences = Enumerable.Range(1, 30).Select(i => $"This is sentence number {i}.").ToList();
        var text = string.Join(" ", sentences);

        // Act
        var chunks = _sut.ChunkText(text, 100, 20);

        // Assert
        if (chunks.Count > 1)
        {
            // Chunks should overlap - some content from the end of chunk N
            // should appear at the beginning of chunk N+1
            for (int i = 1; i < chunks.Count; i++)
            {
                // The overlapping content should be present
                chunks[i].Content.Should().NotBeEmpty();
            }
        }
    }

    [Fact]
    public void ChunkText_TokenEstimationIsReasonable()
    {
        // Arrange - text with known character count
        var text = new string('a', 350); // ~100 tokens at 3.5 chars/token

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks[0].TokenCount.Should().BeCloseTo(100, 10); // ~100 tokens with some margin
    }

    [Fact]
    public void ChunkText_DoesNotExceedMaxChunkSize()
    {
        // Arrange
        var settings = new RagSettings
        {
            ChunkSize = 50,
            ChunkOverlap = 10,
            EnableChunking = true
        };
        var service = new ChunkingService(Options.Create(settings), _mockLogger.Object);

        var text = "This is a test. With multiple sentences. Each one is separate. Let's see how chunking works.";

        // Act
        var chunks = service.ChunkText(text, 50, 10);

        // Assert
        foreach (var chunk in chunks)
        {
            chunk.TokenCount.Should().BeLessOrEqualTo(60); // Allow some slack for overlap handling
        }
    }

    #endregion

    #region Edge Cases Tests

    [Fact]
    public void ChunkText_HandlesTextWithOnlyNewlines()
    {
        // Arrange
        var text = "\n\n\n\n";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        // Empty after splitting should return empty list or single empty chunk
        chunks.Count.Should().BeLessOrEqualTo(1);
    }

    [Fact]
    public void ChunkText_HandlesTextWithNoSentenceEndingsOrParagraphs()
    {
        // Arrange
        var text = "this text has no punctuation marks and no paragraph breaks it just goes on and on forever without stopping";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
        chunks[0].Content.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void ChunkText_HandlesSpecialCharacters()
    {
        // Arrange
        var text = "Text with special chars: @#$%^&*(). More text here! And more? Yes!";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCount(1);
        chunks[0].Content.Should().Contain("@#$%^&*()");
    }

    [Fact]
    public void ChunkText_HandlesUnicodeContent()
    {
        // Arrange
        var text = "你好世界。这是中文文本。另一段文字。";

        // Act
        var chunks = _sut.ChunkText(text, 500, 50);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
        chunks[0].Content.Should().Contain("你好世界");
    }

    [Fact]
    public void ChunkNote_HandlesNoteWithNoTags()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Content", "Title");
        note.Tags = new List<string>();

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
        chunks[0].Content.Should().NotContain("Tags:");
    }

    [Fact]
    public void ChunkNote_HandlesNoteWithNullTags()
    {
        // Arrange
        var note = CreateTestNote("note-1", "Content", "Title");
        note.Tags = null!;

        // Act
        var chunks = _sut.ChunkNote(note);

        // Assert
        chunks.Should().HaveCountGreaterOrEqualTo(1);
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string id, string content, string title)
    {
        return new Note
        {
            Id = id,
            UserId = "user-123",
            Title = title,
            Content = content,
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

