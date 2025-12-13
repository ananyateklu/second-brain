using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Auth.GetCurrentUser;

/// <summary>
/// Handler for GetCurrentUserQuery
/// </summary>
public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Result<AuthResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<GetCurrentUserQueryHandler> _logger;

    public GetCurrentUserQueryHandler(
        IUserRepository userRepository,
        ILogger<GetCurrentUserQueryHandler> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<Result<AuthResponse>> Handle(
        GetCurrentUserQuery request,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);

            if (user == null)
            {
                return Result<AuthResponse>.Failure(Error.NotFound("User not found"));
            }

            return Result<AuthResponse>.Success(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                Username = user.Username,
                DisplayName = user.DisplayName,
                ApiKey = user.ApiKey,
                IsNewUser = false
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving current user. UserId: {UserId}", request.UserId);
            return Result<AuthResponse>.Failure(Error.Internal("Failed to retrieve user information"));
        }
    }
}
