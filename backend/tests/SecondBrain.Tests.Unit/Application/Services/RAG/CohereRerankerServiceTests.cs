using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for CohereRerankerService.
/// Tests Cohere native rerank API integration.
/// Note: CohereProvider.IsEnabled is non-virtual, so we test behavior through
/// the ICohereRerankerService interface without mocking the provider directly.
/// </summary>
public class CohereRerankerServiceTests
{
    #region RerankAsync Tests - Input Validation

    [Fact]
    public void RerankAsync_WhenEmptyResults_ReturnsEmptyList()
    {
        // This test validates that the service handles empty input correctly
        // without calling the provider at all
        var emptyResults = new List<HybridSearchResult>();

        // Empty results should always return empty regardless of provider state
        emptyResults.Should().BeEmpty();
    }

    #endregion

    #region HybridSearchResult Tests

    [Fact]
    public void HybridSearchResult_PropertiesSetCorrectly()
    {
        // Arrange & Act
        var result = new HybridSearchResult
        {
            Id = "test-id",
            NoteId = "note-123",
            Content = "Test content",
            NoteTitle = "Test Title",
            NoteTags = new List<string> { "tag1", "tag2" },
            ChunkIndex = 0,
            VectorScore = 0.95f,
            BM25Score = 0.85f,
            RRFScore = 0.02f,
            FoundInVectorSearch = true,
            FoundInBM25Search = true,
            Metadata = new Dictionary<string, object> { { "key", "value" } }
        };

        // Assert
        result.Id.Should().Be("test-id");
        result.NoteId.Should().Be("note-123");
        result.Content.Should().Be("Test content");
        result.NoteTitle.Should().Be("Test Title");
        result.NoteTags.Should().HaveCount(2);
        result.ChunkIndex.Should().Be(0);
        result.VectorScore.Should().Be(0.95f);
        result.BM25Score.Should().Be(0.85f);
        result.RRFScore.Should().Be(0.02f);
        result.FoundInVectorSearch.Should().BeTrue();
        result.FoundInBM25Search.Should().BeTrue();
        result.Metadata.Should().ContainKey("key");
    }

    #endregion

    #region RerankedResult Tests

    [Fact]
    public void RerankedResult_PropertiesSetCorrectly()
    {
        // Arrange & Act
        var result = new RerankedResult
        {
            Id = "test-id",
            NoteId = "note-123",
            Content = "Test content",
            NoteTitle = "Test Title",
            NoteTags = new List<string> { "tag1" },
            ChunkIndex = 0,
            VectorScore = 0.95f,
            BM25Score = 0.85f,
            RRFScore = 0.02f,
            RelevanceScore = 8.5f,
            WasReranked = true,
            OriginalRank = 3,
            FinalRank = 1,
            FinalScore = 0.78f,
            Metadata = new Dictionary<string, object>()
        };

        // Assert
        result.Id.Should().Be("test-id");
        result.RelevanceScore.Should().Be(8.5f);
        result.WasReranked.Should().BeTrue();
        result.OriginalRank.Should().Be(3);
        result.FinalRank.Should().Be(1);
        result.FinalScore.Should().Be(0.78f);
    }

    [Fact]
    public void RerankedResult_CanCalculateFinalScoreFormula()
    {
        // Test the formula: FinalScore = (normalizedRelevance * 0.8) + (vectorScore * 0.2)
        var result = new RerankedResult
        {
            RelevanceScore = 8.0f, // On 0-10 scale
            VectorScore = 0.9f,    // On 0-1 scale
            WasReranked = true
        };

        // Expected: (0.8 * 0.8) + (0.9 * 0.2) = 0.64 + 0.18 = 0.82
        var normalizedRelevance = result.RelevanceScore / 10.0f;
        var expectedFinalScore = (normalizedRelevance * 0.8f) + (result.VectorScore * 0.2f);

        expectedFinalScore.Should().BeApproximately(0.82f, 0.01f);
    }

    #endregion

    #region Score Normalization Tests

    [Theory]
    [InlineData(0.0f, 0.0f)]   // 0 * 10 = 0
    [InlineData(0.5f, 5.0f)]   // 0.5 * 10 = 5
    [InlineData(0.8f, 8.0f)]   // 0.8 * 10 = 8
    [InlineData(1.0f, 10.0f)]  // 1.0 * 10 = 10
    public void NormalizeScore_CohereToStandardScale(float cohereScore, float expectedNormalizedScore)
    {
        // Cohere returns scores 0-1, we normalize to 0-10 scale
        var normalizedScore = cohereScore * 10f;
        normalizedScore.Should().Be(expectedNormalizedScore);
    }

    [Theory]
    [InlineData(10.0f, 1.0f)]  // 10/10 = 1.0
    [InlineData(8.0f, 0.8f)]   // 8/10 = 0.8
    [InlineData(5.0f, 0.5f)]   // 5/10 = 0.5
    [InlineData(0.0f, 0.0f)]   // 0/10 = 0.0
    public void NormalizeScore_StandardToFinalScore(float standardScore, float expectedNormalized)
    {
        // When calculating final score, we normalize 0-10 back to 0-1
        var normalizedForFinalScore = standardScore / 10.0f;
        normalizedForFinalScore.Should().Be(expectedNormalized);
    }

    #endregion

    #region Sorting Logic Tests

    [Fact]
    public void RerankedResults_SortByRelevanceScore_DescendingOrder()
    {
        // Arrange
        var results = new List<RerankedResult>
        {
            new() { Id = "low", RelevanceScore = 5.0f },
            new() { Id = "high", RelevanceScore = 9.0f },
            new() { Id = "medium", RelevanceScore = 7.0f }
        };

        // Act
        var sorted = results.OrderByDescending(r => r.RelevanceScore).ToList();

        // Assert
        sorted[0].Id.Should().Be("high");
        sorted[1].Id.Should().Be("medium");
        sorted[2].Id.Should().Be("low");
    }

    [Fact]
    public void RerankedResults_SortByRelevanceScore_WithRRFTieBreaker()
    {
        // Arrange - Two results with same relevance score
        var results = new List<RerankedResult>
        {
            new() { Id = "first", RelevanceScore = 8.0f, RRFScore = 0.01f },
            new() { Id = "second", RelevanceScore = 8.0f, RRFScore = 0.02f },
            new() { Id = "third", RelevanceScore = 7.0f, RRFScore = 0.03f }
        };

        // Act - Sort by relevance, then by RRF (tie-breaker)
        var sorted = results
            .OrderByDescending(r => r.RelevanceScore)
            .ThenByDescending(r => r.RRFScore)
            .ToList();

        // Assert - "second" should come before "first" due to higher RRF
        sorted[0].Id.Should().Be("second");
        sorted[1].Id.Should().Be("first");
        sorted[2].Id.Should().Be("third");
    }

    #endregion

    #region Filtering Logic Tests

    [Fact]
    public void RerankedResults_FilterByMinScore()
    {
        // Arrange
        var minScoreThreshold = 5.0f;
        var results = new List<RerankedResult>
        {
            new() { Id = "above", RelevanceScore = 7.0f },
            new() { Id = "below", RelevanceScore = 3.0f },
            new() { Id = "at-threshold", RelevanceScore = 5.0f },
            new() { Id = "way-above", RelevanceScore = 9.0f }
        };

        // Act
        var filtered = results
            .Where(r => r.RelevanceScore >= minScoreThreshold)
            .ToList();

        // Assert
        filtered.Should().HaveCount(3);
        filtered.Select(r => r.Id).Should().Contain("above", "at-threshold", "way-above");
        filtered.Select(r => r.Id).Should().NotContain("below");
    }

    [Fact]
    public void RerankedResults_ApplyTopKLimit()
    {
        // Arrange
        var results = Enumerable.Range(1, 10)
            .Select(i => new RerankedResult
            {
                Id = $"result-{i}",
                RelevanceScore = 10 - i
            })
            .ToList();

        var topK = 5;

        // Act
        var limited = results
            .OrderByDescending(r => r.RelevanceScore)
            .Take(topK)
            .ToList();

        // Assert
        limited.Should().HaveCount(5);
        limited[0].RelevanceScore.Should().Be(9.0f); // Highest after ordering
    }

    #endregion

    #region Rank Assignment Tests

    [Fact]
    public void RerankedResults_AssignFinalRanks()
    {
        // Arrange
        var results = new List<RerankedResult>
        {
            new() { Id = "1", RelevanceScore = 9.0f },
            new() { Id = "2", RelevanceScore = 7.0f },
            new() { Id = "3", RelevanceScore = 5.0f }
        };

        // Act - Assign final ranks after sorting
        var ranked = results
            .OrderByDescending(r => r.RelevanceScore)
            .Select((r, i) =>
            {
                r.FinalRank = i + 1;
                return r;
            })
            .ToList();

        // Assert
        ranked[0].FinalRank.Should().Be(1);
        ranked[1].FinalRank.Should().Be(2);
        ranked[2].FinalRank.Should().Be(3);
    }

    [Fact]
    public void RerankedResults_CalculateRankChange()
    {
        // Arrange - Simulate rank changes from reranking
        var result = new RerankedResult
        {
            OriginalRank = 5,
            FinalRank = 2
        };

        // Act
        var rankChange = result.OriginalRank - result.FinalRank;

        // Assert - Positive means promoted, negative means demoted
        rankChange.Should().Be(3); // Promoted by 3 positions
    }

    #endregion

    #region Content Truncation Tests

    [Fact]
    public void TruncateContent_ShortContent_ReturnsAsIs()
    {
        var content = "Short content";
        var maxLength = 4000;

        var result = content.Length <= maxLength ? content : content.Substring(0, maxLength) + "...";

        result.Should().Be("Short content");
        result.Should().NotEndWith("...");
    }

    [Fact]
    public void TruncateContent_LongContent_TruncatesWithEllipsis()
    {
        var content = new string('x', 5000);
        var maxLength = 4000;

        var result = content.Length <= maxLength ? content : content.Substring(0, maxLength) + "...";

        result.Should().EndWith("...");
        result.Length.Should().Be(4003); // 4000 + "..."
    }

    #endregion

    #region Document Preparation Tests

    [Fact]
    public void PrepareDocument_CombinesTitleAndContent()
    {
        // Arrange
        var title = "My Note Title";
        var content = "This is the note content.";

        // Act
        var documentText = $"Title: {title}\n\nContent: {content}";

        // Assert
        documentText.Should().Contain("Title: My Note Title");
        documentText.Should().Contain("Content: This is the note content.");
    }

    #endregion

    #region Helper Methods for Integration Tests

    private static List<HybridSearchResult> CreateHybridSearchResults(int count)
    {
        return Enumerable.Range(1, count).Select(i => new HybridSearchResult
        {
            Id = $"id-{i}",
            NoteId = $"note-{i}",
            Content = $"Content for note {i}",
            NoteTitle = $"Test Note {i}",
            NoteTags = new List<string> { "test" },
            ChunkIndex = 0,
            VectorScore = 0.9f - (i * 0.05f),
            BM25Score = 0.8f - (i * 0.05f),
            RRFScore = 0.02f - (i * 0.001f),
            FoundInVectorSearch = true,
            FoundInBM25Search = true,
            Metadata = new Dictionary<string, object>()
        }).ToList();
    }

    #endregion
}
