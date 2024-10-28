namespace SecondBrain.Data.Entities
{
    public class TaskItemTag
    {
        public string TaskItemId { get; set; }
        public TaskItem TaskItem { get; set; }

        public string TagId { get; set; }
        public Tag Tag { get; set; }
    }
}
