namespace SecondBrain.Data.Entities
{
    public class IdeaTag
    {
        public string IdeaId { get; set; }
        public Idea Idea { get; set; }

        public string TagId { get; set; }
        public Tag Tag { get; set; }
    }
}
