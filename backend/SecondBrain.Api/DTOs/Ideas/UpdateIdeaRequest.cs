namespace SecondBrain.Api.DTOs.Ideas
{
    public class UpdateIdeaRequest
    {
        public required string Title { get; set; }
        public required string Content { get; set; }
        public required List<string> Tags { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsPinned { get; set; }
        public bool IsArchived { get; set; }
    }
} 