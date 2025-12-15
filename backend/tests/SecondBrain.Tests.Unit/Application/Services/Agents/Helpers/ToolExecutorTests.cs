using System.Reflection;
using System.Text.Json.Nodes;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Moq;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Plugins;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for ToolExecutor.
/// Tests tool execution, parameter aliasing, and multi-tool execution.
/// </summary>
public class ToolExecutorTests
{
    private readonly Mock<ILogger<ToolExecutor>> _mockLogger;
    private readonly ToolExecutor _sut;

    public ToolExecutorTests()
    {
        _mockLogger = new Mock<ILogger<ToolExecutor>>();
        _sut = new ToolExecutor(_mockLogger.Object);
    }

    #region GenerateToolId Tests

    [Fact]
    public void GenerateToolId_WithSameInputs_ReturnsSameId()
    {
        // Arrange
        var toolName = "CreateNote";
        var arguments = "{\"title\":\"Test\"}";

        // Act
        var id1 = _sut.GenerateToolId(toolName, arguments);
        var id2 = _sut.GenerateToolId(toolName, arguments);

        // Assert
        id1.Should().Be(id2);
    }

    [Fact]
    public void GenerateToolId_WithDifferentToolNames_ReturnsDifferentIds()
    {
        // Arrange
        var arguments = "{\"query\":\"test\"}";

        // Act
        var id1 = _sut.GenerateToolId("SearchNotes", arguments);
        var id2 = _sut.GenerateToolId("CreateNote", arguments);

        // Assert
        id1.Should().NotBe(id2);
    }

    [Fact]
    public void GenerateToolId_WithDifferentArguments_ReturnsDifferentIds()
    {
        // Arrange
        var toolName = "CreateNote";

        // Act
        var id1 = _sut.GenerateToolId(toolName, "{\"title\":\"Note1\"}");
        var id2 = _sut.GenerateToolId(toolName, "{\"title\":\"Note2\"}");

        // Assert
        id1.Should().NotBe(id2);
    }

    [Fact]
    public void GenerateToolId_ReturnsAlphanumericString()
    {
        // Arrange
        var toolName = "TestTool";
        var arguments = "{\"param\":\"value\"}";

        // Act
        var id = _sut.GenerateToolId(toolName, arguments);

        // Assert
        id.Should().MatchRegex(@"^[A-Za-z0-9]+$");
    }

    [Fact]
    public void GenerateToolId_ReturnsConsistentLength()
    {
        // Act
        var id1 = _sut.GenerateToolId("Tool1", "{}");
        var id2 = _sut.GenerateToolId("LongerToolName", "{\"very\":\"long\",\"argument\":\"object\"}");

        // Assert - Base64 of 12 bytes = 16 chars minus padding
        id1.Length.Should().Be(id2.Length);
    }

    #endregion

    #region ExecuteMultipleAsync Tests

    [Fact]
    public async Task ExecuteMultipleAsync_WithEmptyList_ReturnsEmptyArray()
    {
        // Arrange
        var toolCalls = new List<PendingToolCall>();
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Act
        var results = await _sut.ExecuteMultipleAsync(toolCalls, pluginMethods, parallelExecution: true);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task ExecuteMultipleAsync_WithUnknownTool_ReturnsErrorResult()
    {
        // Arrange
        var toolCalls = new List<PendingToolCall>
        {
            new("id1", "UnknownTool", "{}", null)
        };
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Act
        var results = await _sut.ExecuteMultipleAsync(toolCalls, pluginMethods, parallelExecution: true);

        // Assert
        results.Should().ContainSingle();
        results[0].Success.Should().BeFalse();
        results[0].Result.Should().Contain("Unknown tool");
        results[0].Name.Should().Be("UnknownTool");
    }

    [Fact]
    public async Task ExecuteMultipleAsync_WithMultipleUnknownTools_ReturnsAllErrors()
    {
        // Arrange
        var toolCalls = new List<PendingToolCall>
        {
            new("id1", "Unknown1", "{}", null),
            new("id2", "Unknown2", "{}", null),
            new("id3", "Unknown3", "{}", null)
        };
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Act
        var results = await _sut.ExecuteMultipleAsync(toolCalls, pluginMethods, parallelExecution: true);

        // Assert
        results.Should().HaveCount(3);
        results.Should().OnlyContain(r => !r.Success);
    }

    [Fact]
    public async Task ExecuteMultipleAsync_SequentialMode_ExecutesInOrder()
    {
        // Arrange
        var executionOrder = new List<string>();
        var toolCalls = new List<PendingToolCall>
        {
            new("id1", "Unknown1", "{}", null),
            new("id2", "Unknown2", "{}", null)
        };
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Act
        var results = await _sut.ExecuteMultipleAsync(toolCalls, pluginMethods, parallelExecution: false);

        // Assert - Sequential execution should return results in order
        results.Should().HaveCount(2);
        results[0].Name.Should().Be("Unknown1");
        results[1].Name.Should().Be("Unknown2");
    }

    [Fact]
    public async Task ExecuteMultipleAsync_ParallelMode_ExecutesAllTools()
    {
        // Arrange
        var toolCalls = new List<PendingToolCall>
        {
            new("id1", "Tool1", "{}", null),
            new("id2", "Tool2", "{}", null),
            new("id3", "Tool3", "{}", null)
        };
        var pluginMethods = new Dictionary<string, (IAgentPlugin Plugin, MethodInfo Method)>();

        // Act
        var results = await _sut.ExecuteMultipleAsync(toolCalls, pluginMethods, parallelExecution: true);

        // Assert
        results.Should().HaveCount(3);
    }

    #endregion

    #region ExecuteAsync Tests

    [Fact]
    public async Task ExecuteAsync_WithException_ReturnsFailureResult()
    {
        // Arrange
        var mockPlugin = new Mock<IAgentPlugin>();
        mockPlugin.Setup(p => p.GetPluginInstance()).Throws(new InvalidOperationException("Plugin error"));
        mockPlugin.Setup(p => p.GetPluginName()).Returns("TestPlugin");

        var toolCall = new PendingToolCall("id1", "TestTool", "{}", null);
        var method = typeof(TestPlugin).GetMethod(nameof(TestPlugin.TestMethod))!;

        // Act
        var result = await _sut.ExecuteAsync(toolCall, mockPlugin.Object, method);

        // Assert
        result.Success.Should().BeFalse();
        result.Result.Should().Contain("Error executing tool");
    }

    [Fact]
    public async Task ExecuteAsync_WithValidPlugin_ReturnsSuccessResult()
    {
        // Arrange
        var plugin = new TestPlugin();
        var mockPluginWrapper = new Mock<IAgentPlugin>();
        mockPluginWrapper.Setup(p => p.GetPluginInstance()).Returns(plugin);
        mockPluginWrapper.Setup(p => p.GetPluginName()).Returns("TestPlugin");

        var toolCall = new PendingToolCall(
            "id1",
            "TestMethod",
            "{\"input\":\"hello\"}",
            JsonNode.Parse("{\"input\":\"hello\"}"));
        var method = typeof(TestPlugin).GetMethod(nameof(TestPlugin.TestMethod))!;

        // Act
        var result = await _sut.ExecuteAsync(toolCall, mockPluginWrapper.Object, method);

        // Assert
        result.Success.Should().BeTrue();
        result.Id.Should().Be("id1");
        result.Name.Should().Be("TestMethod");
    }

    [Fact]
    public async Task ExecuteAsync_WithAsyncMethod_AwaitsResult()
    {
        // Arrange
        var plugin = new TestPlugin();
        var mockPluginWrapper = new Mock<IAgentPlugin>();
        mockPluginWrapper.Setup(p => p.GetPluginInstance()).Returns(plugin);
        mockPluginWrapper.Setup(p => p.GetPluginName()).Returns("TestPlugin");

        var toolCall = new PendingToolCall(
            "id1",
            "AsyncMethod",
            "{\"value\":\"test\"}",
            JsonNode.Parse("{\"value\":\"test\"}"));
        var method = typeof(TestPlugin).GetMethod(nameof(TestPlugin.AsyncMethod))!;

        // Act
        var result = await _sut.ExecuteAsync(toolCall, mockPluginWrapper.Object, method);

        // Assert
        result.Success.Should().BeTrue();
        result.Result.Should().Contain("test");
    }

    #endregion

    #region Test Plugin

    /// <summary>
    /// Test plugin for unit testing tool execution.
    /// </summary>
    private class TestPlugin
    {
        [KernelFunction("TestMethod")]
        public string TestMethod(string input)
        {
            return $"Processed: {input}";
        }

        [KernelFunction("AsyncMethod")]
        public Task<string> AsyncMethod(string value)
        {
            return Task.FromResult($"Async result: {value}");
        }

        [KernelFunction("MethodWithDefaults")]
        public string MethodWithDefaults(string required, string optional = "default")
        {
            return $"{required} - {optional}";
        }
    }

    #endregion
}
