using SecondBrain.Data.Entities;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class UpdateReminderRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime? DueDateTime { get; set; }
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public RepeatInterval? RepeatInterval { get; set; }
        public string? CustomRepeatPattern { get; set; }
        public bool? IsSnoozed { get; set; }
        public DateTime? SnoozeUntil { get; set; }
        public bool? IsCompleted { get; set; }
        public DateTime? CompletedAt { get; set; }
        public List<string>? Tags { get; set; }
        public bool? IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
