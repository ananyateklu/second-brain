using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Chat.DeleteConversation;

/// <summary>
/// Handler for DeleteConversationCommand
/// </summary>
public class DeleteConversationCommandHandler : IRequestHandler<DeleteConversationCommand, Result<bool>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<DeleteConversationCommandHandler> _logger;

    public DeleteConversationCommandHandler(
        IChatConversationService chatService,
        ILogger<DeleteConversationCommandHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        DeleteConversationCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Deleting conversation. ConversationId: {ConversationId}, UserId: {UserId}",
            request.ConversationId, request.UserId);

        try
        {
            var deleted = await _chatService.DeleteConversationAsync(
                request.ConversationId,
                request.UserId,
                cancellationToken);

            if (!deleted)
            {
                return Result<bool>.Failure(
                    Error.Custom("Conversation.NotFound", $"Conversation '{request.ConversationId}' not found"));
            }

            _logger.LogInformation("Conversation deleted. ConversationId: {ConversationId}, UserId: {UserId}",
                request.ConversationId, request.UserId);

            return Result<bool>.Success(true);
        }
        catch (UnauthorizedException)
        {
            return Result<bool>.Failure(
                Error.Custom("Conversation.AccessDenied", "Access denied"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting conversation. ConversationId: {ConversationId}, UserId: {UserId}",
                request.ConversationId, request.UserId);
            return Result<bool>.Failure(
                Error.Internal("Failed to delete conversation"));
        }
    }
}
