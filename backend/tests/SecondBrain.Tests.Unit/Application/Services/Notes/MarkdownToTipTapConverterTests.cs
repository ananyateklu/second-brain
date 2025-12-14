using SecondBrain.Application.Services.Notes;
using System.Text.Json;

namespace SecondBrain.Tests.Unit.Application.Services.Notes;

public class MarkdownToTipTapConverterTests
{
    [Fact]
    public void Convert_EmptyString_ReturnsEmptyDoc()
    {
        var result = MarkdownToTipTapConverter.Convert("");
        var doc = JsonDocument.Parse(result);

        Assert.Equal("doc", doc.RootElement.GetProperty("type").GetString());
        Assert.Equal(1, doc.RootElement.GetProperty("content").GetArrayLength());
        Assert.Equal("paragraph", doc.RootElement.GetProperty("content")[0].GetProperty("type").GetString());
    }

    [Fact]
    public void Convert_SimpleParagraph_CreatesParagraphNode()
    {
        var result = MarkdownToTipTapConverter.Convert("Hello world");
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal(1, content.GetArrayLength());
        Assert.Equal("paragraph", content[0].GetProperty("type").GetString());
        Assert.Equal("Hello world", content[0].GetProperty("content")[0].GetProperty("text").GetString());
    }

    [Fact]
    public void Convert_Heading_CreatesHeadingNode()
    {
        var result = MarkdownToTipTapConverter.Convert("# My Heading");
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("heading", content[0].GetProperty("type").GetString());
        Assert.Equal(1, content[0].GetProperty("attrs").GetProperty("level").GetInt32());
        Assert.Equal("My Heading", content[0].GetProperty("content")[0].GetProperty("text").GetString());
    }

    [Fact]
    public void Convert_MultipleHeadingLevels_SetsCorrectLevels()
    {
        var markdown = "# H1\n## H2\n### H3";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal(1, content[0].GetProperty("attrs").GetProperty("level").GetInt32());
        Assert.Equal(2, content[1].GetProperty("attrs").GetProperty("level").GetInt32());
        Assert.Equal(3, content[2].GetProperty("attrs").GetProperty("level").GetInt32());
    }

    [Fact]
    public void Convert_BulletList_CreatesBulletListNode()
    {
        var markdown = "- Item 1\n- Item 2\n- Item 3";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("bulletList", content[0].GetProperty("type").GetString());

        var listItems = content[0].GetProperty("content");
        Assert.Equal(3, listItems.GetArrayLength());
        Assert.Equal("listItem", listItems[0].GetProperty("type").GetString());
    }

    [Fact]
    public void Convert_OrderedList_CreatesOrderedListNode()
    {
        var markdown = "1. First\n2. Second\n3. Third";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("orderedList", content[0].GetProperty("type").GetString());

        var listItems = content[0].GetProperty("content");
        Assert.Equal(3, listItems.GetArrayLength());
    }

    [Fact]
    public void Convert_BoldText_AddsBoldMark()
    {
        var result = MarkdownToTipTapConverter.Convert("This is **bold** text");
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content")[0].GetProperty("content");
        Assert.Equal(3, content.GetArrayLength());
        Assert.Equal("This is ", content[0].GetProperty("text").GetString());
        Assert.Equal("bold", content[1].GetProperty("text").GetString());
        Assert.Equal("bold", content[1].GetProperty("marks")[0].GetProperty("type").GetString());
        Assert.Equal(" text", content[2].GetProperty("text").GetString());
    }

    [Fact]
    public void Convert_InlineCode_AddsCodeMark()
    {
        var result = MarkdownToTipTapConverter.Convert("Use `npm install` here");
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content")[0].GetProperty("content");
        Assert.Equal("npm install", content[1].GetProperty("text").GetString());
        Assert.Equal("code", content[1].GetProperty("marks")[0].GetProperty("type").GetString());
    }

    [Fact]
    public void Convert_CodeBlock_CreatesCodeBlockNode()
    {
        var markdown = "```javascript\nconsole.log('hello');\n```";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("codeBlock", content[0].GetProperty("type").GetString());
        Assert.Equal("javascript", content[0].GetProperty("attrs").GetProperty("language").GetString());
    }

    [Fact]
    public void Convert_Link_CreatesLinkMark()
    {
        var result = MarkdownToTipTapConverter.Convert("Check [this link](https://example.com)");
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content")[0].GetProperty("content");
        Assert.Equal("this link", content[1].GetProperty("text").GetString());
        Assert.Equal("link", content[1].GetProperty("marks")[0].GetProperty("type").GetString());
        Assert.Equal("https://example.com", content[1].GetProperty("marks")[0].GetProperty("attrs").GetProperty("href").GetString());
    }

    [Fact]
    public void Convert_Blockquote_CreatesBlockquoteNode()
    {
        var markdown = "> This is a quote\n> Second line";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("blockquote", content[0].GetProperty("type").GetString());
    }

    [Fact]
    public void Convert_TaskList_CreatesTaskListNode()
    {
        var markdown = "- [ ] Unchecked task\n- [x] Checked task";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("taskList", content[0].GetProperty("type").GetString());

        var items = content[0].GetProperty("content");
        Assert.False(items[0].GetProperty("attrs").GetProperty("checked").GetBoolean());
        Assert.True(items[1].GetProperty("attrs").GetProperty("checked").GetBoolean());
    }

    [Fact]
    public void Convert_HorizontalRule_CreatesHorizontalRuleNode()
    {
        var markdown = "Before\n---\nAfter";
        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.Equal("paragraph", content[0].GetProperty("type").GetString());
        Assert.Equal("horizontalRule", content[1].GetProperty("type").GetString());
        Assert.Equal("paragraph", content[2].GetProperty("type").GetString());
    }

    [Fact]
    public void Convert_ComplexDocument_HandlesMultipleElements()
    {
        var markdown = @"# Recipe Title

This is the intro.

## Ingredients

- 2 cups flour
- 1 cup sugar

## Instructions

1. Mix dry ingredients
2. Add wet ingredients
3. Bake at 350°F";

        var result = MarkdownToTipTapConverter.Convert(markdown);
        var doc = JsonDocument.Parse(result);

        var content = doc.RootElement.GetProperty("content");
        Assert.True(content.GetArrayLength() > 5);

        // Verify structure
        Assert.Equal("heading", content[0].GetProperty("type").GetString());
        Assert.Equal(1, content[0].GetProperty("attrs").GetProperty("level").GetInt32());
    }
}
