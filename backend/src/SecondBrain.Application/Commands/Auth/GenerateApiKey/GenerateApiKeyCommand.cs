using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Auth.GenerateApiKey;

/// <summary>
/// Command to generate or regenerate an API key for the authenticated user
/// </summary>
public record GenerateApiKeyCommand(
    string UserId
) : IRequest<Result<ApiKeyResponse>>;
