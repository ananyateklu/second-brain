namespace SecondBrain.Api.DTOs.Notes
{
    public class CreateNoteRequest
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public bool IsPinned { get; set; } = false;
        public bool IsFavorite { get; set; } = false;
        public List<string> Tags { get; set; } = new List<string>();
        public List<string> LinkedNoteIds { get; set; } = new List<string>();
    }
}
