namespace SecondBrain.Data.Entities
{
    public class Idea
    {
        public string Id { get; set; }
        public string Content { get; set; }
        // Other properties...

        // Add this
        public ICollection<IdeaTag> IdeaTags { get; set; }
    }
}
