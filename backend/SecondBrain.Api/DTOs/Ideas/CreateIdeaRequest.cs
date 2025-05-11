namespace SecondBrain.Api.DTOs.Ideas
{
    public class CreateIdeaRequest
    {
        public required string Title { get; set; }
        public required string Content { get; set; }
        public List<string> Tags { get; set; } = new List<string>();
        public bool IsFavorite { get; set; }
        public bool IsPinned { get; set; }
    }
} 