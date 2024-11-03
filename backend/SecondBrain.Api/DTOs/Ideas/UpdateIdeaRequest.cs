namespace SecondBrain.Api.DTOs.Ideas
{
    public class UpdateIdeaRequest
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public List<string> Tags { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsPinned { get; set; }
        public bool IsArchived { get; set; }
    }
} 