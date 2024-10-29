using SecondBrain.Data.Entities;

namespace SecondBrain.Api.DTOs.Reminders
{
    public class CreateReminderRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public DateTime DueDateTime { get; set; }
        public RepeatInterval? RepeatInterval { get; set; } // e.g., in days
        public string CustomRepeatPattern { get; set; }
    }
}
