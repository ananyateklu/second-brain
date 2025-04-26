using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents the request body sent from the frontend callback
    // containing the authorization code from TickTick.
    public class TickTickCodeExchangeRequest
    {
        [Required]
        public string Code { get; set; } = string.Empty;
    }
} 