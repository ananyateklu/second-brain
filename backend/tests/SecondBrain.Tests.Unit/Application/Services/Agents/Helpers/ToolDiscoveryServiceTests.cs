using FluentAssertions;
using SecondBrain.Application.Services.Agents.Helpers;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for ToolDiscoveryService.
/// Tests the Tool Search Tool pattern implementation for on-demand tool discovery.
/// </summary>
public class ToolDiscoveryServiceTests
{
    private readonly ToolDiscoveryService _sut;

    public ToolDiscoveryServiceTests()
    {
        _sut = new ToolDiscoveryService();
    }

    #region GetCoreTools Tests

    [Fact]
    public void GetCoreTools_ReturnsNonEmptyList()
    {
        // Act
        var result = _sut.GetCoreTools();

        // Assert
        result.Should().NotBeEmpty();
    }

    [Fact]
    public void GetCoreTools_AllToolsHaveDeferLoadingFalse()
    {
        // Act
        var result = _sut.GetCoreTools();

        // Assert
        result.Should().AllSatisfy(t => t.DeferLoading.Should().BeFalse());
    }

    [Fact]
    public void GetCoreTools_ContainsCrudTools()
    {
        // Act
        var result = _sut.GetCoreTools();

        // Assert
        result.Should().Contain(t => t.Name == "CreateNote");
        result.Should().Contain(t => t.Name == "GetNote");
        result.Should().Contain(t => t.Name == "UpdateNote");
        result.Should().Contain(t => t.Name == "DeleteNote");
    }

    [Fact]
    public void GetCoreTools_ContainsSearchTools()
    {
        // Act
        var result = _sut.GetCoreTools();

        // Assert
        result.Should().Contain(t => t.Name == "SearchNotes");
        result.Should().Contain(t => t.Name == "ListNotes");
    }

    [Fact]
    public void GetCoreTools_ContainsWebTools()
    {
        // Act
        var result = _sut.GetCoreTools();

        // Assert
        result.Should().Contain(t => t.Name == "web_search");
        result.Should().Contain(t => t.Name == "fetch_url");
    }

    #endregion

    #region GetAllTools Tests

    [Fact]
    public void GetAllTools_ReturnsMoreThanCoreTools()
    {
        // Act
        var coreTools = _sut.GetCoreTools();
        var allTools = _sut.GetAllTools();

        // Assert
        allTools.Count.Should().BeGreaterThan(coreTools.Count);
    }

    [Fact]
    public void GetAllTools_ContainsBothCoreAndDeferredTools()
    {
        // Act
        var result = _sut.GetAllTools();

        // Assert
        result.Should().Contain(t => t.DeferLoading == false);
        result.Should().Contain(t => t.DeferLoading == true);
    }

    [Fact]
    public void GetAllTools_AllToolsHaveRequiredProperties()
    {
        // Act
        var result = _sut.GetAllTools();

        // Assert
        result.Should().AllSatisfy(t =>
        {
            t.Name.Should().NotBeNullOrEmpty();
            t.Description.Should().NotBeNullOrEmpty();
            t.Category.Should().NotBeNullOrEmpty();
            t.Keywords.Should().NotBeEmpty();
        });
    }

    #endregion

    #region GetToolByName Tests

    [Fact]
    public void GetToolByName_WhenToolExists_ReturnsTool()
    {
        // Act
        var result = _sut.GetToolByName("CreateNote");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("CreateNote");
    }

    [Fact]
    public void GetToolByName_IsCaseInsensitive()
    {
        // Act
        var result = _sut.GetToolByName("createnote");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("CreateNote");
    }

    [Fact]
    public void GetToolByName_WhenToolNotExists_ReturnsNull()
    {
        // Act
        var result = _sut.GetToolByName("NonExistentTool");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetToolsByCategory Tests

    [Fact]
    public void GetToolsByCategory_ReturnsToolsInCategory()
    {
        // Act
        var result = _sut.GetToolsByCategory(ToolCategories.Core);

        // Assert
        result.Should().NotBeEmpty();
        result.Should().AllSatisfy(t => t.Category.Should().Be(ToolCategories.Core));
    }

    [Fact]
    public void GetToolsByCategory_IsCaseInsensitive()
    {
        // Act
        var result = _sut.GetToolsByCategory("CORE");

        // Assert
        result.Should().NotBeEmpty();
    }

    [Fact]
    public void GetToolsByCategory_WhenCategoryNotExists_ReturnsEmpty()
    {
        // Act
        var result = _sut.GetToolsByCategory("nonexistent-category");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region SearchTools Tests

    [Fact]
    public void SearchTools_WhenQueryEmpty_ReturnsEmpty()
    {
        // Act
        var result = _sut.SearchTools("");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void SearchTools_WhenQueryNull_ReturnsEmpty()
    {
        // Act
        var result = _sut.SearchTools(null!);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void SearchTools_FindsToolByName()
    {
        // Act
        var result = _sut.SearchTools("CreateNote");

        // Assert
        result.Should().NotBeEmpty();
        result.First().Name.Should().Be("CreateNote");
    }

    [Fact]
    public void SearchTools_FindsToolByKeyword()
    {
        // Act
        var result = _sut.SearchTools("version history");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(t => t.Category == ToolCategories.Version);
    }

    [Fact]
    public void SearchTools_FindsToolByCategory()
    {
        // Act
        var result = _sut.SearchTools("trash");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(t => t.Name == "ManageTrash");
    }

    [Fact]
    public void SearchTools_RespectsMaxResults()
    {
        // Act
        var result = _sut.SearchTools("note", maxResults: 3);

        // Assert
        result.Count.Should().BeLessThanOrEqualTo(3);
    }

    [Fact]
    public void SearchTools_ReturnsResultsOrderedByRelevance()
    {
        // Act - search for "create" should return CreateNote first
        var result = _sut.SearchTools("create");

        // Assert
        result.Should().NotBeEmpty();
        result.First().Name.Should().Be("CreateNote");
    }

    [Fact]
    public void SearchTools_FindsAnalysisTools()
    {
        // Act
        var result = _sut.SearchTools("analyze summarize");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(t => t.Name == "AnalyzeNote");
    }

    [Fact]
    public void SearchTools_FindsImageTools()
    {
        // Act
        var result = _sut.SearchTools("image photo");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(t => t.Category == ToolCategories.Images);
    }

    [Fact]
    public void SearchTools_FindsWebTools()
    {
        // Act
        var result = _sut.SearchTools("web search internet");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(t => t.Name == "web_search");
    }

    #endregion

    #region Tool Category Coverage Tests

    [Fact]
    public void AllToolCategories_AreRepresented()
    {
        // Arrange
        var expectedCategories = new[]
        {
            ToolCategories.Core,
            ToolCategories.Organization,
            ToolCategories.Analysis,
            ToolCategories.Version,
            ToolCategories.Trash,
            ToolCategories.Images,
            ToolCategories.Web
        };

        // Act
        var allTools = _sut.GetAllTools();
        var representedCategories = allTools.Select(t => t.Category).Distinct();

        // Assert
        representedCategories.Should().Contain(expectedCategories);
    }

    #endregion
}
