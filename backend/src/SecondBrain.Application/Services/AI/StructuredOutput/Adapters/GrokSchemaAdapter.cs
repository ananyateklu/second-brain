using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Adapters;

/// <summary>
/// Converts JsonSchemaDefinition for Grok/XAI provider.
/// Grok uses an OpenAI-compatible API, so this adapter reuses OpenAISchemaAdapter.
/// </summary>
public static class GrokSchemaAdapter
{
    /// <summary>
    /// Convert a JsonSchemaDefinition to BinaryData for Grok's CreateJsonSchemaFormat.
    /// Reuses the OpenAI adapter since Grok is OpenAI-compatible.
    /// </summary>
    public static BinaryData ToBinaryData(JsonSchemaDefinition schema)
    {
        return OpenAISchemaAdapter.ToBinaryData(schema);
    }

    /// <summary>
    /// Convert a type to BinaryData schema.
    /// </summary>
    public static BinaryData ToBinaryData<T>()
    {
        return OpenAISchemaAdapter.ToBinaryData<T>();
    }

    /// <summary>
    /// Convert a JsonSchemaDefinition to JSON string for debugging.
    /// </summary>
    public static string ToJsonString(JsonSchemaDefinition schema)
    {
        return OpenAISchemaAdapter.ToJsonString(schema);
    }
}
