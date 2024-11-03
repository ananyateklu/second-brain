namespace SecondBrain.Api.DTOs.Ideas
{
    public class CreateIdeaRequest
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public List<string> Tags { get; set; } = new List<string>();
        public bool IsFavorite { get; set; }
    }
} 