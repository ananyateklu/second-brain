using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Data.Entities
{
    public class Tag
    {
        [Key]
        [MaxLength(36)]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
} 