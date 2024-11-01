using System.Text.Json.Serialization;
using SecondBrain.Data.Entities;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class CreateReminderRequest
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = null!;

        [JsonPropertyName("description")]
        public string Description { get; set; } = null!;

        public DateTime DueDateTime { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public RepeatInterval? RepeatInterval { get; set; }

        public string? CustomRepeatPattern { get; set; }
        public List<string>? Tags { get; set; }
    }
}
