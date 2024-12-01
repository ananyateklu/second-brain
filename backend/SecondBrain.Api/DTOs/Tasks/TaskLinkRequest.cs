namespace SecondBrain.Api.DTOs.Tasks
{
    public class TaskLinkRequest
    {
        public string TaskId { get; set; } = string.Empty;
        public string LinkedItemId { get; set; } = string.Empty;
        public string LinkType { get; set; } = string.Empty; // "note" or "idea"
        public string? Description { get; set; }
    }
} 