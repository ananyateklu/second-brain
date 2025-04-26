using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents a potential error JSON response from TickTick's token endpoint
    public class TickTickErrorResponse
    {
        [JsonPropertyName("error")]
        public string Error { get; set; } = string.Empty; // e.g., "invalid_grant", "invalid_client"

        [JsonPropertyName("error_description")]
        public string? ErrorDescription { get; set; } // Optional human-readable description
    }
} 