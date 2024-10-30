using System.ComponentModel.DataAnnotations;
using SecondBrain.Data.Entities;

namespace SecondBrain.Data.Entities
{
    public class IdeaTag
    {
        [Required]
        [MaxLength(36)]
        public string IdeaId { get; set; } = string.Empty;

        public Idea Idea { get; set; } = null!;

        [Required]
        [MaxLength(36)]
        public string TagId { get; set; } = string.Empty;

        public Tag Tag { get; set; } = null!;
    }
}
