using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents a Project object returned by TickTick Open API
    public class TickTickProject
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("color")]
        public string? Color { get; set; }

        [JsonPropertyName("closed")]
        public bool Closed { get; set; }

        [JsonPropertyName("groupId")]
        public string? GroupId { get; set; }

        [JsonPropertyName("viewMode")]
        public string? ViewMode { get; set; }

        [JsonPropertyName("kind")]
        public string? Kind { get; set; }
    }
} 