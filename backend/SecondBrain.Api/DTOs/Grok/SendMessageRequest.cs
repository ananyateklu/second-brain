namespace SecondBrain.Api.DTOs.Grok
{
    public class SendMessageRequest
    {
        public required string Model { get; set; }
        public required Message[] Messages { get; set; }
        public bool Stream { get; set; }
        public double Temperature { get; set; }
        public Tool[]? Tools { get; set; }
    }

    public class Message
    {
        public required string Role { get; set; }
        public required string Content { get; set; }
        public ToolCall[]? ToolCalls { get; set; }
        public string? ToolCallId { get; set; }
    }

    public class Tool
    {
        public required string Type { get; set; } = "function";
        public required Function Function { get; set; }
    }

    public class Function
    {
        public required string Name { get; set; }
        public required string Description { get; set; }
        public required ParameterDefinition Parameters { get; set; }
    }

    public class ParameterDefinition
    {
        public required string Type { get; set; }
        public required Dictionary<string, PropertyDefinition> Properties { get; set; }
        public required string[] Required { get; set; }
    }

    public class PropertyDefinition
    {
        public required string Type { get; set; }
        public required string Description { get; set; }
        public required string ExampleValue { get; set; }
    }

    public class ToolCall
    {
        public required string Id { get; set; }
        public required string Type { get; set; }
        public required FunctionCall Function { get; set; }
    }

    public class FunctionCall
    {
        public required string Name { get; set; }
        public required string Arguments { get; set; }
    }
} 