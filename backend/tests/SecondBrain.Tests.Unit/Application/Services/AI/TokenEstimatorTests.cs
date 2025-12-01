using SecondBrain.Application.Services.AI;

namespace SecondBrain.Tests.Unit.Application.Services.AI;

public class TokenEstimatorTests
{
    #region EstimateTokenCount Tests

    [Fact]
    public void EstimateTokenCount_WhenNull_ReturnsZero()
    {
        // Act
        var result = TokenEstimator.EstimateTokenCount(null!);

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public void EstimateTokenCount_WhenEmpty_ReturnsZero()
    {
        // Act
        var result = TokenEstimator.EstimateTokenCount(string.Empty);

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public void EstimateTokenCount_WhenWhitespace_ReturnsZero()
    {
        // Act
        var result = TokenEstimator.EstimateTokenCount("   ");

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public void EstimateTokenCount_WhenTabsAndNewlines_ReturnsZero()
    {
        // Act
        var result = TokenEstimator.EstimateTokenCount("\t\n\r  \t");

        // Assert
        result.Should().Be(0);
    }

    [Theory]
    [InlineData("a", 1)]                    // 1 char = ceil(1/3.5) = 1 token
    [InlineData("ab", 1)]                   // 2 chars = ceil(2/3.5) = 1 token
    [InlineData("abc", 1)]                  // 3 chars = ceil(3/3.5) = 1 token
    [InlineData("abcd", 2)]                 // 4 chars = ceil(4/3.5) = 2 tokens
    [InlineData("abcdefg", 2)]              // 7 chars = ceil(7/3.5) = 2 tokens
    [InlineData("abcdefgh", 3)]             // 8 chars = ceil(8/3.5) = 3 tokens
    public void EstimateTokenCount_WithVariousLengths_ReturnsExpectedTokenCount(string text, int expectedTokens)
    {
        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result.Should().Be(expectedTokens);
    }

    [Fact]
    public void EstimateTokenCount_WithLongText_ReturnsCorrectEstimate()
    {
        // Arrange - Create a 350 character string
        var text = new string('x', 350);
        // Expected: ceil(350/3.5) = 100 tokens

        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result.Should().Be(100);
    }

    [Fact]
    public void EstimateTokenCount_WithTypicalSentence_ReturnsReasonableEstimate()
    {
        // Arrange
        var text = "The quick brown fox jumps over the lazy dog.";
        // 44 characters = ceil(44/3.5) = 13 tokens

        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result.Should().Be(13);
    }

    [Fact]
    public void EstimateTokenCount_WithUnicodeCharacters_CountsAllCharacters()
    {
        // Arrange
        var text = "Hello 世界 🌍";  // 11 characters including spaces and emoji
        // Expected: ceil(11/3.5) = 4 tokens

        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result.Should().Be(4);
    }

    [Fact]
    public void EstimateTokenCount_WithNewlinesInMiddle_CountsAllCharacters()
    {
        // Arrange
        var text = "Hello\nWorld";  // 11 characters including newline

        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert - ceil(11/3.5) = 4
        result.Should().Be(4);
    }

    [Fact]
    public void EstimateTokenCount_WithMixedContent_ReturnsPositiveValue()
    {
        // Arrange
        var text = "Code: function test() { return 42; }";

        // Act
        var result = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result.Should().BePositive();
        result.Should().Be((int)Math.Ceiling(text.Length / 3.5));
    }

    [Fact]
    public void EstimateTokenCount_IsConsistentForSameInput()
    {
        // Arrange
        var text = "This is a test string for consistency check.";

        // Act
        var result1 = TokenEstimator.EstimateTokenCount(text);
        var result2 = TokenEstimator.EstimateTokenCount(text);
        var result3 = TokenEstimator.EstimateTokenCount(text);

        // Assert
        result1.Should().Be(result2);
        result2.Should().Be(result3);
    }

    #endregion
}

