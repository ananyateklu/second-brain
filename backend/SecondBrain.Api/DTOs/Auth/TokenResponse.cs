namespace SecondBrain.Api.DTOs.Auth
{
    public class TokenResponse
    {
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
        public required UserResponse User { get; set; }
    }
}