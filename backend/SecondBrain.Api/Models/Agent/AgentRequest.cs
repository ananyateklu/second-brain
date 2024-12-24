using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Agent
{
    public class Tool
    {
        public required string Name { get; set; }
        public required string Type { get; set; }
        public required string Description { get; set; }
        public Dictionary<string, object>? Parameters { get; set; }
        public List<string>? RequiredPermissions { get; set; }
    }

    public class AgentRequest
    {
        public required string Prompt { get; set; }
        public required string ModelId { get; set; }
        public string? ChatId { get; set; }
        public int? MaxTokens { get; set; } = 1000;
        public float? Temperature { get; set; } = 0.7f;
        public List<Tool>? Tools { get; set; }

        // Convert to snake_case for Python API
        public Dictionary<string, object> ToSnakeCase()
        {
            return new Dictionary<string, object>
            {
                { "prompt", Prompt },
                { "model_id", ModelId },
                { "chat_id", ChatId ?? string.Empty },
                { "max_tokens", MaxTokens ?? 1000 },
                { "temperature", Temperature ?? 0.7f },
                { "tools", Tools?.Select(t => new Dictionary<string, object>
                {
                    { "name", t.Name },
                    { "type", t.Type },
                    { "description", t.Description },
                    { "parameters", t.Parameters ?? new Dictionary<string, object>() },
                    { "required_permissions", t.RequiredPermissions ?? new List<string>() }
                }).ToList() ?? new List<Dictionary<string, object>>() }
            };
        }
    }
}