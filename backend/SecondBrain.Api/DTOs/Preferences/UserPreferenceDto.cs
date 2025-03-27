using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Api.DTOs.Preferences
{
    public class UserPreferenceDto
    {
        public string Id { get; set; } = string.Empty;
        public string PreferenceType { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveUserPreferenceRequest
    {
        [Required]
        [MaxLength(50)]
        public string PreferenceType { get; set; } = string.Empty;

        [Required]
        public string Value { get; set; } = string.Empty;
    }

    public class UpdateUserPreferenceRequest
    {
        [Required]
        public string Value { get; set; } = string.Empty;
    }
} 