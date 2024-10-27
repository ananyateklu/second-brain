namespace SecondBrain.Api.DTOs.Auth
{
    public class TokenResponse
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public UserResponse User { get; set; }
    }
}