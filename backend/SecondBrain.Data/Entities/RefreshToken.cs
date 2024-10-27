using System;

namespace SecondBrain.Data.Entities
{
    public class RefreshToken
    {
        public string Id { get; set; } = string.Empty; // Initialized to empty string
        public string Token { get; set; } = string.Empty; // Initialized to empty string
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime CreatedAt { get; set; }

        // Foreign Key
        public string UserId { get; set; } = string.Empty; // Initialized to empty string
        public User User { get; set; } = null!; // Suppress null warning since EF Core sets it
    }
}
