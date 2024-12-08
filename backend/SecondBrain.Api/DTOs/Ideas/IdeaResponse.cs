namespace SecondBrain.Api.DTOs.Ideas
{
    public class IdeaResponse
    {
        public required string Id { get; set; }
        public required string Title { get; set; }
        public required string Content { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsArchived { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public required DateTime CreatedAt { get; set; }
        public required DateTime UpdatedAt { get; set; }
        public required List<string> Tags { get; set; }
        public required List<LinkedItemResponse> LinkedItems { get; set; }
    }

    public class LinkedItemResponse
    {
        public required string Id { get; set; }
        public required string Type { get; set; }
        public required string Title { get; set; }
    }
}