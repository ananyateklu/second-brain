using FluentAssertions;
using Moq;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Plugins;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Plugins;

/// <summary>
/// Unit tests for ToolSearchPlugin.
/// Tests the Tool Search Tool pattern for on-demand tool discovery.
/// </summary>
public class ToolSearchPluginTests
{
    private readonly Mock<IToolDiscoveryService> _mockDiscoveryService;
    private readonly ToolSearchPlugin _sut;

    public ToolSearchPluginTests()
    {
        _mockDiscoveryService = new Mock<IToolDiscoveryService>();
        _sut = new ToolSearchPlugin(_mockDiscoveryService.Object);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsToolDiscovery()
    {
        _sut.CapabilityId.Should().Be("tool-discovery");
    }

    [Fact]
    public void DisplayName_ReturnsToolDiscovery()
    {
        _sut.DisplayName.Should().Be("Tool Discovery");
    }

    [Fact]
    public void Description_ContainsSearch()
    {
        _sut.Description.Should().Contain("Search");
    }

    [Fact]
    public void GetPluginName_ReturnsToolSearch()
    {
        _sut.GetPluginName().Should().Be("ToolSearch");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsSearchToolsDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("search_tools");
        result.Should().Contain("Tool Discovery");
    }

    [Fact]
    public void GetPluginInstance_ReturnsSelf()
    {
        _sut.GetPluginInstance().Should().BeSameAs(_sut);
    }

    #endregion

    #region SearchToolsAsync Tests

    [Fact]
    public async Task SearchToolsAsync_WhenQueryEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.SearchToolsAsync("");

        // Assert
        result.Should().Contain("provide search keywords");
    }

    [Fact]
    public async Task SearchToolsAsync_WhenNoResults_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockDiscoveryService.Setup(s => s.SearchTools(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(new List<ToolMetadata>().AsReadOnly());

        // Act
        var result = await _sut.SearchToolsAsync("nonexistent");

        // Assert
        result.Should().Contain("No tools found");
        result.Should().Contain("suggestions");
    }

    [Fact]
    public async Task SearchToolsAsync_WhenResultsFound_ReturnsToolsWithDescriptions()
    {
        // Arrange
        var tools = new List<ToolMetadata>
        {
            new ToolMetadata
            {
                Name = "CreateNote",
                Description = "Create a new note",
                Category = ToolCategories.Core,
                Keywords = new List<string> { "create", "new" },
                DeferLoading = false,
                PluginName = "Notes"
            }
        };
        _mockDiscoveryService.Setup(s => s.SearchTools("create", 5))
            .Returns(tools.AsReadOnly());

        // Act
        var result = await _sut.SearchToolsAsync("create");

        // Assert
        result.Should().Contain("CreateNote");
        result.Should().Contain("Create a new note");
        result.Should().Contain("tool_search_results");
    }

    [Fact]
    public async Task SearchToolsAsync_RespectsMaxResults()
    {
        // Arrange
        _mockDiscoveryService.Setup(s => s.SearchTools("note", 3))
            .Returns(new List<ToolMetadata>().AsReadOnly());

        // Act
        await _sut.SearchToolsAsync("note", maxResults: 3);

        // Assert
        _mockDiscoveryService.Verify(s => s.SearchTools("note", 3), Times.Once);
    }

    [Fact]
    public async Task SearchToolsAsync_CapsMaxResultsAt10()
    {
        // Arrange
        _mockDiscoveryService.Setup(s => s.SearchTools(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(new List<ToolMetadata>().AsReadOnly());

        // Act
        await _sut.SearchToolsAsync("note", maxResults: 100);

        // Assert
        _mockDiscoveryService.Verify(s => s.SearchTools("note", 10), Times.Once);
    }

    [Fact]
    public async Task SearchToolsAsync_IncludesDeferLoadingStatus()
    {
        // Arrange
        var tools = new List<ToolMetadata>
        {
            new ToolMetadata
            {
                Name = "AnalyzeNote",
                Description = "AI analysis",
                Category = ToolCategories.Analysis,
                Keywords = new List<string> { "analyze" },
                DeferLoading = true,
                PluginName = "Notes"
            }
        };
        _mockDiscoveryService.Setup(s => s.SearchTools(It.IsAny<string>(), It.IsAny<int>()))
            .Returns(tools.AsReadOnly());

        // Act
        var result = await _sut.SearchToolsAsync("analyze");

        // Assert
        result.Should().Contain("isDeferred");
    }

    #endregion

    #region ListToolCategoriesAsync Tests

    [Fact]
    public async Task ListToolCategoriesAsync_ReturnsAllCategories()
    {
        // Arrange
        var tools = new List<ToolMetadata>
        {
            new ToolMetadata { Name = "Tool1", Description = "D1", Category = ToolCategories.Core, Keywords = new List<string>(), DeferLoading = false },
            new ToolMetadata { Name = "Tool2", Description = "D2", Category = ToolCategories.Analysis, Keywords = new List<string>(), DeferLoading = true }
        };
        _mockDiscoveryService.Setup(s => s.GetAllTools()).Returns(tools.AsReadOnly());

        // Act
        var result = await _sut.ListToolCategoriesAsync();

        // Assert
        result.Should().Contain("tool_categories");
        result.Should().Contain(ToolCategories.Core);
        result.Should().Contain(ToolCategories.Analysis);
    }

    [Fact]
    public async Task ListToolCategoriesAsync_IncludesToolCounts()
    {
        // Arrange
        var tools = new List<ToolMetadata>
        {
            new ToolMetadata { Name = "Tool1", Description = "D1", Category = ToolCategories.Core, Keywords = new List<string>(), DeferLoading = false },
            new ToolMetadata { Name = "Tool2", Description = "D2", Category = ToolCategories.Core, Keywords = new List<string>(), DeferLoading = true },
            new ToolMetadata { Name = "Tool3", Description = "D3", Category = ToolCategories.Analysis, Keywords = new List<string>(), DeferLoading = true }
        };
        _mockDiscoveryService.Setup(s => s.GetAllTools()).Returns(tools.AsReadOnly());

        // Act
        var result = await _sut.ListToolCategoriesAsync();

        // Assert
        result.Should().Contain("totalTools");
        result.Should().Contain("coreToolsCount");
        result.Should().Contain("deferredToolsCount");
    }

    #endregion
}
