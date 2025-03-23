namespace SecondBrain.Api.DTOs.Notes
{
    public class AddLinkRequest
    {
        public string TargetNoteId { get; set; } = string.Empty;
        
        // Optional link type property
        public string? LinkType { get; set; }
    }
} 