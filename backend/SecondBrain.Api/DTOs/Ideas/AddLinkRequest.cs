namespace SecondBrain.Api.DTOs.Ideas
{
    public class AddLinkRequest
    {
        public required string LinkedItemId { get; set; }
        public required string LinkedItemType { get; set; } // "Note" or "Idea"
    }
}