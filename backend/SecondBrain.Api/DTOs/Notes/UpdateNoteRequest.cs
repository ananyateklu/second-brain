namespace SecondBrain.Api.DTOs.Notes
{
    public class UpdateNoteRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPinned { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public List<string> Tags { get; set; } = new List<string>();
        public List<string> LinkedNotes { get; set; } = new List<string>();
    }
}
