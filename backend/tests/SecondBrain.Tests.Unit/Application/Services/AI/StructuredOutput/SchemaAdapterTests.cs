using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using SecondBrain.Application.Services.AI.StructuredOutput.Adapters;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.StructuredOutput;

public class SchemaAdapterTests
{
    #region Test Types

    public class SampleOutput
    {
        [Description("The title of the item")]
        [Required]
        public string Title { get; set; } = string.Empty;

        [Description("A brief description")]
        public string Description { get; set; } = string.Empty;

        [Description("Relevance score from 0 to 1")]
        [Range(0.0, 1.0)]
        public float Score { get; set; }

        public List<string> Tags { get; set; } = new();
    }

    #endregion

    #region OpenAI Adapter Tests

    [Fact]
    public void OpenAISchemaAdapter_ToBinaryData_ReturnsValidBinaryData()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var binaryData = OpenAISchemaAdapter.ToBinaryData(schema);

        // Assert
        Assert.NotNull(binaryData);
        var bytes = binaryData.ToArray();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public void OpenAISchemaAdapter_ToBinaryData_ProducesValidJson()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var binaryData = OpenAISchemaAdapter.ToBinaryData(schema);
        var json = binaryData.ToString();

        // Assert
        Assert.NotNull(json);
        var parsed = JsonDocument.Parse(json);
        Assert.Equal("object", parsed.RootElement.GetProperty("type").GetString());
    }

    [Fact]
    public void OpenAISchemaAdapter_ToBinaryDataGeneric_ProducesCorrectSchema()
    {
        // Act
        var binaryData = OpenAISchemaAdapter.ToBinaryData<SampleOutput>();
        var json = binaryData.ToString();

        // Assert
        var parsed = JsonDocument.Parse(json);
        Assert.True(parsed.RootElement.TryGetProperty("properties", out var properties));
        Assert.True(properties.TryGetProperty("title", out _));
        Assert.True(properties.TryGetProperty("description", out _));
        Assert.True(properties.TryGetProperty("score", out _));
        Assert.True(properties.TryGetProperty("tags", out _));
    }

    [Fact]
    public void OpenAISchemaAdapter_ToJsonString_ProducesReadableJson()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var jsonString = OpenAISchemaAdapter.ToJsonString(schema);

        // Assert
        Assert.Contains("\"type\": \"object\"", jsonString);
        Assert.Contains("\"properties\"", jsonString);
    }

    #endregion

    #region Xai Adapter Tests

    [Fact]
    public void XaiSchemaAdapter_ToBinaryData_ReusesOpenAIAdapter()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var openAIResult = OpenAISchemaAdapter.ToBinaryData(schema);
        var xaiResult = XaiSchemaAdapter.ToBinaryData(schema);

        // Assert
        Assert.Equal(openAIResult.ToString(), xaiResult.ToString());
    }

    #endregion

    #region Claude Adapter Tests

    [Fact]
    public void AnthropicSchemaAdapter_ToToolParameters_ReturnsDictionary()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var parameters = AnthropicSchemaAdapter.ToToolParameters(schema);

        // Assert
        Assert.NotNull(parameters);
        Assert.True(parameters.ContainsKey("type"));
        Assert.Equal("object", parameters["type"]);
    }

    [Fact]
    public void AnthropicSchemaAdapter_ToToolParameters_IncludesProperties()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var parameters = AnthropicSchemaAdapter.ToToolParameters(schema);

        // Assert
        Assert.True(parameters.ContainsKey("properties"));
        var properties = parameters["properties"] as Dictionary<string, object>;
        Assert.NotNull(properties);
        Assert.True(properties.ContainsKey("title"));
        Assert.True(properties.ContainsKey("description"));
    }

    [Fact]
    public void AnthropicSchemaAdapter_GetToolName_ReturnsExpectedName()
    {
        // Act
        var toolName = AnthropicSchemaAdapter.GetToolName();

        // Assert
        Assert.Equal("structured_output", toolName);
    }

    [Fact]
    public void AnthropicSchemaAdapter_GetToolDescription_ReturnsNonEmpty()
    {
        // Act
        var description = AnthropicSchemaAdapter.GetToolDescription();

        // Assert
        Assert.NotNull(description);
        Assert.NotEmpty(description);
    }

    [Fact]
    public void AnthropicSchemaAdapter_ToJsonString_ProducesValidJson()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var jsonString = AnthropicSchemaAdapter.ToJsonString(schema);

        // Assert
        var parsed = JsonDocument.Parse(jsonString);
        Assert.Equal("object", parsed.RootElement.GetProperty("type").GetString());
    }

    #endregion

    #region Gemini Adapter Tests

    [Fact]
    public void GoogleSchemaAdapter_ToGeminiSchema_ReturnsNonNull()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var geminiSchema = GoogleSchemaAdapter.ToGeminiSchema(schema);

        // Assert
        Assert.NotNull(geminiSchema);
    }

    [Fact]
    public void GoogleSchemaAdapter_FromType_Generic_ReturnsNonNull()
    {
        // Act
        var geminiSchema = GoogleSchemaAdapter.FromType<SampleOutput>();

        // Assert
        Assert.NotNull(geminiSchema);
    }

    [Fact]
    public void GoogleSchemaAdapter_FromType_Runtime_ReturnsNonNull()
    {
        // Act
        var geminiSchema = GoogleSchemaAdapter.FromType(typeof(SampleOutput));

        // Assert
        Assert.NotNull(geminiSchema);
    }

    #endregion

    #region Ollama Adapter Tests

    [Fact]
    public void OllamaSchemaAdapter_ToSystemPromptSchema_IncludesSchemaJson()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var systemPrompt = OllamaSchemaAdapter.ToSystemPromptSchema(schema);

        // Assert
        Assert.Contains("You must respond with valid JSON", systemPrompt);
        Assert.Contains("\"type\": \"object\"", systemPrompt);
        Assert.Contains("\"properties\"", systemPrompt);
    }

    [Fact]
    public void OllamaSchemaAdapter_ToSystemPromptSchema_IncludesInstructions()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var systemPrompt = OllamaSchemaAdapter.ToSystemPromptSchema(schema);

        // Assert
        Assert.Contains("Return ONLY the JSON object", systemPrompt);
        Assert.Contains("required fields", systemPrompt);
    }

    [Fact]
    public void OllamaSchemaAdapter_ToSystemPromptSchemaGeneric_ProducesValidPrompt()
    {
        // Act
        var systemPrompt = OllamaSchemaAdapter.ToSystemPromptSchema<SampleOutput>();

        // Assert
        Assert.Contains("\"title\"", systemPrompt);
        Assert.Contains("\"description\"", systemPrompt);
    }

    [Fact]
    public void OllamaSchemaAdapter_CombineWithSystemInstruction_WithCustomInstruction()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();
        var customInstruction = "You are a helpful assistant.";

        // Act
        var combined = OllamaSchemaAdapter.CombineWithSystemInstruction(schema, customInstruction);

        // Assert
        Assert.StartsWith(customInstruction, combined);
        Assert.Contains("\"type\": \"object\"", combined);
    }

    [Fact]
    public void OllamaSchemaAdapter_CombineWithSystemInstruction_WithNullInstruction()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var combined = OllamaSchemaAdapter.CombineWithSystemInstruction(schema, null);

        // Assert
        Assert.Contains("You must respond with valid JSON", combined);
    }

    [Fact]
    public void OllamaSchemaAdapter_CombineWithSystemInstruction_WithEmptyInstruction()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var combined = OllamaSchemaAdapter.CombineWithSystemInstruction(schema, "");

        // Assert
        Assert.Contains("You must respond with valid JSON", combined);
        Assert.DoesNotContain("\n\n\n", combined); // No extra newlines
    }

    [Fact]
    public void OllamaSchemaAdapter_ToJsonString_ProducesValidJson()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var jsonString = OllamaSchemaAdapter.ToJsonString(schema);

        // Assert
        var parsed = JsonDocument.Parse(jsonString);
        Assert.Equal("object", parsed.RootElement.GetProperty("type").GetString());
    }

    #endregion

    #region Cross-Adapter Consistency Tests

    [Fact]
    public void AllAdapters_ProduceConsistentPropertyNames()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<SampleOutput>();

        // Act
        var openAIJson = OpenAISchemaAdapter.ToJsonString(schema);
        var claudeJson = AnthropicSchemaAdapter.ToJsonString(schema);
        var ollamaJson = OllamaSchemaAdapter.ToJsonString(schema);

        // Assert - All should have same property names in camelCase
        foreach (var json in new[] { openAIJson, claudeJson, ollamaJson })
        {
            Assert.Contains("\"title\"", json);
            Assert.Contains("\"description\"", json);
            Assert.Contains("\"score\"", json);
            Assert.Contains("\"tags\"", json);
        }
    }

    [Fact]
    public void AllAdapters_HandleNestedTypes()
    {
        // Arrange
        var schema = JsonSchemaBuilder.FromType<NestedTestType>();

        // Act - Should not throw
        var openAIData = OpenAISchemaAdapter.ToBinaryData(schema);
        var claudeParams = AnthropicSchemaAdapter.ToToolParameters(schema);
        var geminiSchema = GoogleSchemaAdapter.ToGeminiSchema(schema);
        var ollamaPrompt = OllamaSchemaAdapter.ToSystemPromptSchema(schema);

        // Assert - All should contain nested properties
        Assert.NotNull(openAIData);
        Assert.NotNull(claudeParams);
        Assert.NotNull(geminiSchema);
        Assert.Contains("inner", ollamaPrompt);
    }

    public class NestedTestType
    {
        public string Name { get; set; } = string.Empty;
        public InnerType Inner { get; set; } = new();
    }

    public class InnerType
    {
        public int Value { get; set; }
    }

    #endregion
}
