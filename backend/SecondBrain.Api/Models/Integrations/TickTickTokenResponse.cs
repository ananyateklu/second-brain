using System.Text.Json.Serialization;
using System;

namespace SecondBrain.Api.Models.Integrations
{
    // Represents the successful JSON response from TickTick's token endpoint
    // Based on standard OAuth 2.0, verify against actual TickTick API documentation
    public class TickTickTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [JsonPropertyName("token_type")]
        public string TokenType { get; set; } = string.Empty; // Typically "bearer"

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; } // Duration in seconds until the access token expires

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; } // Optional: Used to obtain new access tokens

        [JsonPropertyName("scope")]
        public string Scope { get; set; } = string.Empty; // Space-separated list of granted scopes

        // Calculated property to store the absolute expiration time
        public DateTime ExpiresAt => DateTime.UtcNow.AddSeconds(ExpiresIn);
    }
} 