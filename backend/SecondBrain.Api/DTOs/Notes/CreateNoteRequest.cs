namespace SecondBrain.Api.DTOs.Notes
{
    public class CreateNoteRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public List<string>? Tags { get; set; }
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
    }
}
