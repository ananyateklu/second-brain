
// SecondBrain.Api/DTOs/Auth/UserResponse.cs
namespace SecondBrain.Api.DTOs.Auth
{
    public class UserResponse
    {
        public string Id { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}