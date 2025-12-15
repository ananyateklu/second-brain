using FluentAssertions;
using SecondBrain.Application.Services.Agents.Helpers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for ThinkingExtractor.
/// Tests extraction of XML thinking blocks and native thinking support detection.
/// </summary>
public class ThinkingExtractorTests
{
    private readonly ThinkingExtractor _sut;

    public ThinkingExtractorTests()
    {
        _sut = new ThinkingExtractor();
    }

    #region ExtractXmlThinkingBlocks Tests

    [Fact]
    public void ExtractXmlThinkingBlocks_WhenContentIsNull_ReturnsEmpty()
    {
        // Arrange
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(null!, alreadyEmitted).ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WhenContentIsEmpty_ReturnsEmpty()
    {
        // Arrange
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks("", alreadyEmitted).ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WhenNoThinkingBlocks_ReturnsEmpty()
    {
        // Arrange
        var content = "This is just regular content without any thinking blocks.";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithSingleThinkingBlock_ExtractsContent()
    {
        // Arrange
        var content = "Here is some text <thinking>I need to analyze this problem</thinking> and more text.";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("I need to analyze this problem");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithMultipleThinkingBlocks_ExtractsAll()
    {
        // Arrange
        var content = "<thinking>First thought</thinking> some text <thinking>Second thought</thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Should().Be("First thought");
        result[1].Should().Be("Second thought");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithCaseInsensitiveTags_ExtractsContent()
    {
        // Arrange
        var content = "<THINKING>Upper case content</THINKING>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("Upper case content");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithMixedCaseTags_ExtractsContent()
    {
        // Arrange
        var content = "<Thinking>Mixed case content</Thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("Mixed case content");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_SkipsAlreadyEmittedContent()
    {
        // Arrange
        var content = "<thinking>Already seen</thinking> <thinking>New content</thinking>";
        var alreadyEmitted = new HashSet<string> { "Already seen" };

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("New content");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_AddsExtractedContentToAlreadyEmitted()
    {
        // Arrange
        var content = "<thinking>New thought</thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        alreadyEmitted.Should().Contain("New thought");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithWhitespaceContent_TrimsContent()
    {
        // Arrange
        var content = "<thinking>   Trimmed content   </thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("Trimmed content");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithEmptyThinkingBlock_SkipsIt()
    {
        // Arrange
        var content = "<thinking>   </thinking> <thinking>Valid content</thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("Valid content");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithUnclosedTag_StopsExtraction()
    {
        // Arrange
        var content = "<thinking>First</thinking> <thinking>Unclosed content";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("First");
    }

    [Fact]
    public void ExtractXmlThinkingBlocks_WithMultilineContent_ExtractsCorrectly()
    {
        // Arrange
        var content = @"<thinking>
Line 1
Line 2
Line 3
</thinking>";
        var alreadyEmitted = new HashSet<string>();

        // Act
        var result = _sut.ExtractXmlThinkingBlocks(content, alreadyEmitted).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Contain("Line 1");
        result[0].Should().Contain("Line 2");
        result[0].Should().Contain("Line 3");
    }

    #endregion

    #region SupportsNativeThinking Tests

    [Theory]
    [InlineData("claude", "claude-opus-4-20250514", true)]
    [InlineData("anthropic", "claude-sonnet-4-20250514", true)]
    [InlineData("claude", "claude-3-7-sonnet-20250219", true)]
    [InlineData("anthropic", "claude-3-5-sonnet-20241022", true)]
    public void SupportsNativeThinking_WithSupportedAnthropicModel_ReturnsTrue(
        string provider, string model, bool expected)
    {
        // Act
        var result = _sut.SupportsNativeThinking(provider, model);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("openai", "gpt-4")]
    [InlineData("gemini", "gemini-pro")]
    [InlineData("grok", "grok-3")]
    [InlineData("ollama", "llama3")]
    public void SupportsNativeThinking_WithNonAnthropicProvider_ReturnsFalse(string provider, string model)
    {
        // Act
        var result = _sut.SupportsNativeThinking(provider, model);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("claude", "claude-3-haiku")]
    [InlineData("anthropic", "claude-2")]
    [InlineData("claude", "claude-instant")]
    public void SupportsNativeThinking_WithUnsupportedAnthropicModel_ReturnsFalse(string provider, string model)
    {
        // Act
        var result = _sut.SupportsNativeThinking(provider, model);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("CLAUDE")]
    [InlineData("Claude")]
    [InlineData("ANTHROPIC")]
    [InlineData("Anthropic")]
    public void SupportsNativeThinking_WithCaseInsensitiveProvider_Works(string provider)
    {
        // Act
        var result = _sut.SupportsNativeThinking(provider, "claude-opus-4-20250514");

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("CLAUDE-OPUS-4")]
    [InlineData("Claude-Opus-4")]
    public void SupportsNativeThinking_WithCaseInsensitiveModel_Works(string model)
    {
        // Act
        var result = _sut.SupportsNativeThinking("claude", model);

        // Assert
        result.Should().BeTrue();
    }

    #endregion
}
