using System.Text.Json;
using SecondBrain.Application.Services.AI.StructuredOutput.Common;

namespace SecondBrain.Application.Services.AI.StructuredOutput.Adapters;

/// <summary>
/// Converts JsonSchemaDefinition to Ollama's expected format.
/// Ollama uses Format = "json" with schema in system prompt.
/// </summary>
public static class OllamaSchemaAdapter
{
    private static readonly JsonSerializerOptions IndentedOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Convert a JsonSchemaDefinition to a system prompt instruction.
    /// This tells Ollama to output JSON matching the schema.
    /// </summary>
    public static string ToSystemPromptSchema(JsonSchemaDefinition schema)
    {
        var schemaJson = JsonSerializer.Serialize(schema, IndentedOptions);
        return $"""
            You must respond with valid JSON that matches this schema exactly:
            
            ```json
            {schemaJson}
            ```
            
            Important rules:
            - Return ONLY the JSON object, no additional text or explanation
            - All required fields must be present
            - Use the exact property names and types specified
            - Do not include any markdown formatting around the JSON
            """;
    }

    /// <summary>
    /// Convert a type to system prompt schema instruction.
    /// </summary>
    public static string ToSystemPromptSchema<T>()
    {
        var schema = JsonSchemaBuilder.FromType<T>();
        return ToSystemPromptSchema(schema);
    }

    /// <summary>
    /// Combine the schema instruction with an optional custom system instruction.
    /// </summary>
    public static string CombineWithSystemInstruction(JsonSchemaDefinition schema, string? customInstruction)
    {
        var schemaPrompt = ToSystemPromptSchema(schema);

        if (string.IsNullOrEmpty(customInstruction))
        {
            return schemaPrompt;
        }

        return $"{customInstruction}\n\n{schemaPrompt}";
    }

    /// <summary>
    /// Get the JSON string representation of a schema for debugging.
    /// </summary>
    public static string ToJsonString(JsonSchemaDefinition schema)
    {
        return JsonSerializer.Serialize(schema, IndentedOptions);
    }
}
