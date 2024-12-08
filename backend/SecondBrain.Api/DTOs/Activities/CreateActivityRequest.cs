namespace SecondBrain.Api.DTOs.Activities
{
    public class CreateActivityRequest
    {
        public required string ActionType { get; set; }
        public required string ItemType { get; set; }
        public required string ItemId { get; set; }
        public required string ItemTitle { get; set; }
        public required string Description { get; set; }
        public object? Metadata { get; set; }
    }
}
