using SecondBrain.Data.Entities;
using SecondBrain.Api.DTOs.Auth;

namespace SecondBrain.Api.Services
{
    public interface ITokenService
    {
        Task<TokenResponse> GenerateTokensAsync(User user);
        Task<TokenResponse> RefreshTokensAsync(string refreshToken);
    }
}
