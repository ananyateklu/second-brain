using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class Tag
    {
        [Key]
        public string Id { get; set; }

        [Required]
        public string Name { get; set; }

        public ICollection<TaskItemTag> TaskItemTags { get; set; }
    }
}
