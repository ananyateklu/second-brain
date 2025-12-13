using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Auth.GenerateApiKey;

/// <summary>
/// Handler for GenerateApiKeyCommand
/// </summary>
public class GenerateApiKeyCommandHandler : IRequestHandler<GenerateApiKeyCommand, Result<ApiKeyResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<GenerateApiKeyCommandHandler> _logger;

    public GenerateApiKeyCommandHandler(
        IUserRepository userRepository,
        ILogger<GenerateApiKeyCommandHandler> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<Result<ApiKeyResponse>> Handle(
        GenerateApiKeyCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);

            if (user == null)
            {
                return Result<ApiKeyResponse>.Failure(Error.NotFound("User not found"));
            }

            // Generate new API key
            user.ApiKey = Guid.NewGuid().ToString("N"); // 32-character hex string
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(request.UserId, user);

            _logger.LogInformation("API key generated for user. UserId: {UserId}", request.UserId);

            return Result<ApiKeyResponse>.Success(new ApiKeyResponse
            {
                ApiKey = user.ApiKey,
                GeneratedAt = user.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating API key. UserId: {UserId}", request.UserId);
            return Result<ApiKeyResponse>.Failure(Error.Internal("Failed to generate API key"));
        }
    }
}
