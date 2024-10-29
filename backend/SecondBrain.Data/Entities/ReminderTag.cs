namespace SecondBrain.Data.Entities
{
    public class ReminderTag
    {
        public string ReminderId { get; set; }
        public Reminder Reminder { get; set; }

        public string TagId { get; set; }
        public Tag Tag { get; set; }
    }
}
