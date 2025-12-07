using System.Text;
using System.Text.Json.Nodes;

namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Builder class for accumulating tool use content from streaming responses.
/// Claude streams tool calls as partial JSON fragments that need to be assembled.
/// </summary>
public class ToolUseBuilder
{
    private readonly StringBuilder _inputBuilder = new();

    /// <summary>
    /// Unique identifier for this tool call
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Name of the tool being called
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The index of this content block in the response
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Append partial JSON input to the builder
    /// </summary>
    public void AppendInput(string partialJson)
    {
        _inputBuilder.Append(partialJson);
    }

    /// <summary>
    /// Get the accumulated input as a string
    /// </summary>
    public string GetInputString()
    {
        return _inputBuilder.ToString();
    }

    /// <summary>
    /// Parse the accumulated input as JSON
    /// </summary>
    public JsonNode? GetInputAsJson()
    {
        var inputStr = _inputBuilder.ToString();
        if (string.IsNullOrEmpty(inputStr))
            return null;

        try
        {
            return JsonNode.Parse(inputStr);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Build the final tool call information
    /// </summary>
    public (string Id, string Name, JsonNode? Input) Build()
    {
        return (Id, Name, GetInputAsJson());
    }
}
