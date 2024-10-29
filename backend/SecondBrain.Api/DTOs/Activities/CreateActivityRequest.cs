namespace SecondBrain.Api.DTOs.Activities
{
    public class CreateActivityRequest
    {
        public string ActionType { get; set; }    // e.g., create, edit, delete
        public string ItemType { get; set; }      // e.g., note, task, idea, reminder
        public string ItemId { get; set; }
        public string ItemTitle { get; set; }
        public string Description { get; set; }
        public object Metadata { get; set; }      // Optional metadata
    }
}
