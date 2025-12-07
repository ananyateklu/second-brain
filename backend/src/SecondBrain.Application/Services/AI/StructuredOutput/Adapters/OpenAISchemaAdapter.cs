using System.Text.Json;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Adapters;

/// <summary>
/// Converts JsonSchemaDefinition to OpenAI's expected BinaryData format.
/// Used by both OpenAI and Grok (OpenAI-compatible) providers.
/// </summary>
public static class OpenAISchemaAdapter
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Convert a JsonSchemaDefinition to BinaryData for OpenAI's CreateJsonSchemaFormat.
    /// </summary>
    public static BinaryData ToBinaryData(JsonSchemaDefinition schema)
    {
        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(schema, SerializerOptions);
        return BinaryData.FromBytes(jsonBytes);
    }

    /// <summary>
    /// Convert a JsonSchemaDefinition to BinaryData from a type.
    /// </summary>
    public static BinaryData ToBinaryData<T>()
    {
        var schema = JsonSchemaBuilder.FromType<T>();
        return ToBinaryData(schema);
    }

    /// <summary>
    /// Convert a JsonSchemaDefinition to JSON string for debugging.
    /// </summary>
    public static string ToJsonString(JsonSchemaDefinition schema)
    {
        return JsonSerializer.Serialize(schema, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
    }
}
