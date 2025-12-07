using Google.GenAI.Types;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;
using GeminiType = Google.GenAI.Types.Type;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Adapters;

/// <summary>
/// Converts JsonSchemaDefinition to Google Gemini's Schema type.
/// </summary>
public static class GeminiSchemaAdapter
{
    /// <summary>
    /// Convert a JsonSchemaDefinition to Google.GenAI.Types.Schema.
    /// </summary>
    public static Schema ToGeminiSchema(JsonSchemaDefinition schema)
    {
        return ConvertToGeminiSchema(schema);
    }

    /// <summary>
    /// Build a Gemini Schema directly from a C# type.
    /// </summary>
    public static Schema FromType<T>()
    {
        var jsonSchema = JsonSchemaBuilder.FromType<T>();
        return ToGeminiSchema(jsonSchema);
    }

    /// <summary>
    /// Build a Gemini Schema directly from a runtime type.
    /// </summary>
    public static Schema FromType(System.Type type)
    {
        var jsonSchema = JsonSchemaBuilder.FromType(type);
        return ToGeminiSchema(jsonSchema);
    }

    /// <summary>
    /// Recursively convert JsonSchemaDefinition to Gemini Schema.
    /// </summary>
    private static Schema ConvertToGeminiSchema(JsonSchemaDefinition schema)
    {
        var geminiSchema = new Schema
        {
            Type = MapType(schema.Type),
            Nullable = schema.Nullable
        };

        if (!string.IsNullOrEmpty(schema.Description))
        {
            geminiSchema.Description = schema.Description;
        }

        if (schema.Properties != null && schema.Properties.Count > 0)
        {
            geminiSchema.Properties = new Dictionary<string, Schema>();
            foreach (var (key, value) in schema.Properties)
            {
                geminiSchema.Properties[key] = ConvertToGeminiSchema(value);
            }
        }

        if (schema.Required != null && schema.Required.Count > 0)
        {
            geminiSchema.Required = schema.Required;
        }

        if (schema.Items != null)
        {
            geminiSchema.Items = ConvertToGeminiSchema(schema.Items);
        }

        if (schema.Enum != null && schema.Enum.Count > 0)
        {
            geminiSchema.Enum = schema.Enum;
        }

        return geminiSchema;
    }

    /// <summary>
    /// Map JSON Schema type string to Gemini Type enum.
    /// </summary>
    private static GeminiType MapType(string jsonType)
    {
        return jsonType.ToLowerInvariant() switch
        {
            "string" => GeminiType.STRING,
            "number" => GeminiType.NUMBER,
            "integer" => GeminiType.INTEGER,
            "boolean" => GeminiType.BOOLEAN,
            "array" => GeminiType.ARRAY,
            "object" => GeminiType.OBJECT,
            _ => GeminiType.STRING
        };
    }
}
