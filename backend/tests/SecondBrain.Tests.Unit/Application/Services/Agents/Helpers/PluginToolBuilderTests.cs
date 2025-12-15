using System.ComponentModel;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Moq;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Plugins;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for PluginToolBuilder.
/// Tests building tool definitions for different AI providers.
/// </summary>
public class PluginToolBuilderTests
{
    private readonly Mock<ILogger<PluginToolBuilder>> _mockLogger;
    private readonly PluginToolBuilder _sut;

    public PluginToolBuilderTests()
    {
        _mockLogger = new Mock<ILogger<PluginToolBuilder>>();
        _sut = new PluginToolBuilder(_mockLogger.Object);
    }

    #region GetJsonSchemaType Tests

    [Theory]
    [InlineData(typeof(string), "string")]
    [InlineData(typeof(int), "integer")]
    [InlineData(typeof(long), "integer")]
    [InlineData(typeof(float), "number")]
    [InlineData(typeof(double), "number")]
    [InlineData(typeof(decimal), "number")]
    [InlineData(typeof(bool), "boolean")]
    [InlineData(typeof(string[]), "array")]
    [InlineData(typeof(List<int>), "array")]
    public void GetJsonSchemaType_WithKnownType_ReturnsCorrectSchema(Type type, string expected)
    {
        // Act
        var result = _sut.GetJsonSchemaType(type);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void GetJsonSchemaType_WithNullableInt_ReturnsInteger()
    {
        // Act
        var result = _sut.GetJsonSchemaType(typeof(int?));

        // Assert
        result.Should().Be("integer");
    }

    [Fact]
    public void GetJsonSchemaType_WithNullableString_ReturnsString()
    {
        // Note: string? is just string at runtime
        // Act
        var result = _sut.GetJsonSchemaType(typeof(string));

        // Assert
        result.Should().Be("string");
    }

    [Fact]
    public void GetJsonSchemaType_WithUnknownType_ReturnsString()
    {
        // Act
        var result = _sut.GetJsonSchemaType(typeof(DateTime));

        // Assert
        result.Should().Be("string");
    }

    [Fact]
    public void GetJsonSchemaType_WithCustomClass_ReturnsString()
    {
        // Act
        var result = _sut.GetJsonSchemaType(typeof(TestPluginClass));

        // Assert
        result.Should().Be("string");
    }

    #endregion

    #region BuildAnthropicTools Tests

    [Fact]
    public void BuildAnthropicTools_WithEmptyCapabilities_ReturnsEmptyTools()
    {
        // Arrange
        var capabilities = new List<string>();
        var plugins = new Dictionary<string, IAgentPlugin>();

        // Act
        var (tools, methods) = _sut.BuildAnthropicTools(capabilities, plugins, "user1", false);

        // Assert
        tools.Should().BeEmpty();
        methods.Should().BeEmpty();
    }

    [Fact]
    public void BuildAnthropicTools_WithUnknownCapability_SkipsIt()
    {
        // Arrange
        var capabilities = new List<string> { "unknown-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>();

        // Act
        var (tools, methods) = _sut.BuildAnthropicTools(capabilities, plugins, "user1", false);

        // Assert
        tools.Should().BeEmpty();
        methods.Should().BeEmpty();
    }

    [Fact]
    public void BuildAnthropicTools_WithValidPlugin_BuildsTools()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        var (tools, methods) = _sut.BuildAnthropicTools(capabilities, plugins, "user1", true);

        // Assert
        tools.Should().NotBeEmpty();
        methods.Should().NotBeEmpty();
    }

    [Fact]
    public void BuildAnthropicTools_SetsUserIdOnPlugin()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        _sut.BuildAnthropicTools(capabilities, plugins, "user123", false);

        // Assert
        mockPlugin.Verify(p => p.SetCurrentUserId("user123"), Times.Once);
    }

    [Fact]
    public void BuildAnthropicTools_SetsAgentRagEnabledOnPlugin()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        _sut.BuildAnthropicTools(capabilities, plugins, "user1", agentRagEnabled: true);

        // Assert
        mockPlugin.Verify(p => p.SetAgentRagEnabled(true), Times.Once);
    }

    #endregion

    #region BuildOpenAITools Tests

    [Fact]
    public void BuildOpenAITools_WithEmptyCapabilities_ReturnsEmptyTools()
    {
        // Arrange
        var capabilities = new List<string>();
        var plugins = new Dictionary<string, IAgentPlugin>();

        // Act
        var (tools, methods) = _sut.BuildOpenAITools(capabilities, plugins, "user1", false);

        // Assert
        tools.Should().BeEmpty();
        methods.Should().BeEmpty();
    }

    [Fact]
    public void BuildOpenAITools_WithValidPlugin_BuildsTools()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        var (tools, methods) = _sut.BuildOpenAITools(capabilities, plugins, "user1", true);

        // Assert
        tools.Should().NotBeEmpty();
        methods.Should().NotBeEmpty();
    }

    [Fact]
    public void BuildOpenAITools_WithStrictMode_BuildsTools()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        var (tools, methods) = _sut.BuildOpenAITools(
            capabilities, plugins, "user1", true, useStrictMode: true);

        // Assert
        tools.Should().NotBeEmpty();
    }

    #endregion

    #region BuildGeminiTools Tests

    [Fact]
    public void BuildGeminiTools_WithEmptyCapabilities_ReturnsEmptyDeclarations()
    {
        // Arrange
        var capabilities = new List<string>();
        var plugins = new Dictionary<string, IAgentPlugin>();

        // Act
        var (declarations, methods) = _sut.BuildGeminiTools(capabilities, plugins, "user1", false);

        // Assert
        declarations.Should().BeEmpty();
        methods.Should().BeEmpty();
    }

    [Fact]
    public void BuildGeminiTools_WithValidPlugin_BuildsDeclarations()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        var (declarations, methods) = _sut.BuildGeminiTools(capabilities, plugins, "user1", true);

        // Assert
        declarations.Should().NotBeEmpty();
        methods.Should().NotBeEmpty();
    }

    #endregion

    #region BuildOllamaTools Tests

    [Fact]
    public void BuildOllamaTools_WithEmptyCapabilities_ReturnsEmptyTools()
    {
        // Arrange
        var capabilities = new List<string>();
        var plugins = new Dictionary<string, IAgentPlugin>();

        // Act
        var (tools, methods) = _sut.BuildOllamaTools(capabilities, plugins, "user1", false);

        // Assert
        tools.Should().BeEmpty();
        methods.Should().BeEmpty();
    }

    [Fact]
    public void BuildOllamaTools_WithValidPlugin_BuildsTools()
    {
        // Arrange
        var mockPlugin = CreateMockPlugin();
        var capabilities = new List<string> { "test-capability" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "test-capability", mockPlugin.Object }
        };

        // Act
        var (tools, methods) = _sut.BuildOllamaTools(capabilities, plugins, "user1", true);

        // Assert
        tools.Should().NotBeEmpty();
        methods.Should().NotBeEmpty();
    }

    #endregion

    #region Multiple Capabilities Tests

    [Fact]
    public void BuildAnthropicTools_WithMultipleCapabilities_BuildsAllTools()
    {
        // Arrange
        var mockPlugin1 = CreateMockPlugin();
        var mockPlugin2 = CreateMockPlugin();
        var capabilities = new List<string> { "cap1", "cap2" };
        var plugins = new Dictionary<string, IAgentPlugin>
        {
            { "cap1", mockPlugin1.Object },
            { "cap2", mockPlugin2.Object }
        };

        // Act
        var (tools, methods) = _sut.BuildAnthropicTools(capabilities, plugins, "user1", false);

        // Assert
        tools.Should().HaveCountGreaterThanOrEqualTo(2); // At least 2 tools (1 per plugin)
    }

    #endregion

    #region Helper Methods

    private static Mock<IAgentPlugin> CreateMockPlugin()
    {
        var mockPlugin = new Mock<IAgentPlugin>();
        var testInstance = new TestPluginClass();

        mockPlugin.Setup(p => p.GetPluginInstance()).Returns(testInstance);
        mockPlugin.Setup(p => p.GetPluginName()).Returns("TestPlugin");

        return mockPlugin;
    }

    /// <summary>
    /// Test plugin class with decorated methods.
    /// </summary>
    private class TestPluginClass
    {
        [KernelFunction("TestFunction")]
        [Description("A test function for unit testing")]
        public string TestFunction(
            [Description("The input string")] string input,
            [Description("Optional count")] int count = 1)
        {
            return $"{input} x {count}";
        }

        [KernelFunction("SearchFunction")]
        [Description("Search for items")]
        public Task<string> SearchFunction(
            [Description("The search query")] string query)
        {
            return Task.FromResult($"Results for: {query}");
        }
    }

    #endregion
}
