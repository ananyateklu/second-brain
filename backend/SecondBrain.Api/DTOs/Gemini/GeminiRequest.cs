using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public required GeminiContent[] Contents { get; set; }

        [JsonPropertyName("safetySettings")]
        public SafetySetting[]? SafetySettings { get; set; }

        [JsonPropertyName("generationConfig")]
        public GenerationConfig? GenerationConfig { get; set; }
        
        [JsonPropertyName("tools")]
        public Tool[]? Tools { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public required ContentPart[] Parts { get; set; }
        
        [JsonPropertyName("role")]
        public string? Role { get; set; } // user, model, function
    }

    public class ContentPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
        
        [JsonPropertyName("inline_data")]
        public InlineData? InlineData { get; set; }
        
        [JsonPropertyName("file_data")]
        public FileData? FileData { get; set; }
        
        [JsonPropertyName("function_call")]
        public FunctionCall? FunctionCall { get; set; }
        
        [JsonPropertyName("function_response")]
        public FunctionResponse? FunctionResponse { get; set; }
    }

    public class SafetySetting
    {
        [JsonPropertyName("category")]
        public required string Category { get; set; }

        [JsonPropertyName("threshold")]
        public required string Threshold { get; set; }
    }

    public class GenerationConfig
    {
        [JsonPropertyName("stopSequences")]
        public required string[] StopSequences { get; set; }

        [JsonPropertyName("temperature")]
        public float Temperature { get; set; }

        [JsonPropertyName("maxOutputTokens")]
        public int MaxOutputTokens { get; set; }

        [JsonPropertyName("topP")]
        public float TopP { get; set; }

        [JsonPropertyName("topK")]
        public int TopK { get; set; }
        
        [JsonPropertyName("candidateCount")]
        public int? CandidateCount { get; set; }
        
        [JsonPropertyName("responseMimeType")]
        public string? ResponseMimeType { get; set; } // e.g., "application/json"
        
        [JsonPropertyName("responseSchema")]
        public object? ResponseSchema { get; set; } // OpenAPI schema for JSON output structure
    }
    
    // Function calling support
    public class Tool
    {
        [JsonPropertyName("function_declarations")]
        public required FunctionDeclaration[] FunctionDeclarations { get; set; }
    }
    
    public class FunctionDeclaration
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }
        
        [JsonPropertyName("description")]
        public required string Description { get; set; }
        
        [JsonPropertyName("parameters")]
        public required object Parameters { get; set; } // OpenAPI schema object
    }
    
    public class FunctionCall
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }
        
        [JsonPropertyName("args")]
        public required object Args { get; set; } // Function arguments as JSON object
    }
    
    public class FunctionResponse
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }
        
        [JsonPropertyName("response")]
        public required object Response { get; set; } // Function response as JSON object
    }
}
