using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class ReminderLinkRequest
    {
        [JsonPropertyName("linkedItemId")]
        public string LinkedItemId { get; set; } = string.Empty;

        [JsonPropertyName("linkType")]
        public string LinkType { get; set; } = string.Empty; // "note" or "idea"

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }
} 