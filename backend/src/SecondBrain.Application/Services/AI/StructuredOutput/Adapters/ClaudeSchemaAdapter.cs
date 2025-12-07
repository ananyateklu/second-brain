using System.Text.Json;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Adapters;

/// <summary>
/// Converts JsonSchemaDefinition to Anthropic Claude's tool definition format.
/// Claude uses "tool forcing" to guarantee structured JSON output.
/// </summary>
public static class ClaudeSchemaAdapter
{
    private const string OutputToolName = "structured_output";
    private const string OutputToolDescription = "Return the structured output in the specified format";

    /// <summary>
    /// Convert a JsonSchemaDefinition to a tool parameters dictionary for Claude.
    /// Claude expects tool parameters in a specific dictionary format.
    /// </summary>
    public static Dictionary<string, object> ToToolParameters(JsonSchemaDefinition schema)
    {
        return ConvertSchemaToDict(schema);
    }

    /// <summary>
    /// Get the tool name for structured output.
    /// </summary>
    public static string GetToolName() => OutputToolName;

    /// <summary>
    /// Get the tool description for structured output.
    /// </summary>
    public static string GetToolDescription() => OutputToolDescription;

    /// <summary>
    /// Convert a JsonSchemaDefinition to JSON string for the tool parameters.
    /// </summary>
    public static string ToJsonString(JsonSchemaDefinition schema)
    {
        var dict = ToToolParameters(schema);
        return JsonSerializer.Serialize(dict, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    /// <summary>
    /// Recursively convert JsonSchemaDefinition to a dictionary structure.
    /// </summary>
    private static Dictionary<string, object> ConvertSchemaToDict(JsonSchemaDefinition schema)
    {
        var result = new Dictionary<string, object>
        {
            ["type"] = schema.Type
        };

        if (!string.IsNullOrEmpty(schema.Description))
        {
            result["description"] = schema.Description;
        }

        if (schema.Properties != null && schema.Properties.Count > 0)
        {
            var properties = new Dictionary<string, object>();
            foreach (var (key, value) in schema.Properties)
            {
                properties[key] = ConvertSchemaToDict(value);
            }
            result["properties"] = properties;
        }

        if (schema.Required != null && schema.Required.Count > 0)
        {
            result["required"] = schema.Required;
        }

        if (schema.Items != null)
        {
            result["items"] = ConvertSchemaToDict(schema.Items);
        }

        if (schema.Enum != null && schema.Enum.Count > 0)
        {
            result["enum"] = schema.Enum;
        }

        if (schema.Minimum.HasValue)
        {
            result["minimum"] = schema.Minimum.Value;
        }

        if (schema.Maximum.HasValue)
        {
            result["maximum"] = schema.Maximum.Value;
        }

        if (schema.MinLength.HasValue)
        {
            result["minLength"] = schema.MinLength.Value;
        }

        if (schema.MaxLength.HasValue)
        {
            result["maxLength"] = schema.MaxLength.Value;
        }

        if (schema.MinItems.HasValue)
        {
            result["minItems"] = schema.MinItems.Value;
        }

        if (schema.MaxItems.HasValue)
        {
            result["maxItems"] = schema.MaxItems.Value;
        }

        if (!string.IsNullOrEmpty(schema.Format))
        {
            result["format"] = schema.Format;
        }

        return result;
    }
}
