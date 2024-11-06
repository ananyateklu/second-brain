namespace SecondBrain.Api.DTOs.Grok
{
    public class SendMessageRequest
    {
        public string Model { get; set; }
        public Message[] Messages { get; set; }
        public bool Stream { get; set; }
        public double Temperature { get; set; }
        public Tool[]? Tools { get; set; }
    }

    public class Message
    {
        public string Role { get; set; }
        public string Content { get; set; }
        public ToolCall[]? ToolCalls { get; set; }
        public string? ToolCallId { get; set; }
    }

    public class Tool
    {
        public string Type { get; set; } = "function";
        public Function Function { get; set; }
    }

    public class Function
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public ParameterDefinition Parameters { get; set; }
    }

    public class ParameterDefinition
    {
        public string Type { get; set; }
        public Dictionary<string, PropertyDefinition> Properties { get; set; }
        public string[] Required { get; set; }
    }

    public class PropertyDefinition
    {
        public string Type { get; set; }
        public string Description { get; set; }
        public string ExampleValue { get; set; }
    }

    public class ToolCall
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public FunctionCall Function { get; set; }
    }

    public class FunctionCall
    {
        public string Name { get; set; }
        public string Arguments { get; set; }
    }
} 