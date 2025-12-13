using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Chat.BulkDeleteConversations;

/// <summary>
/// Handler for BulkDeleteConversationsCommand
/// </summary>
public class BulkDeleteConversationsCommandHandler : IRequestHandler<BulkDeleteConversationsCommand, Result<int>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<BulkDeleteConversationsCommandHandler> _logger;

    public BulkDeleteConversationsCommandHandler(
        IChatConversationService chatService,
        ILogger<BulkDeleteConversationsCommandHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(
        BulkDeleteConversationsCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Bulk deleting {Count} conversations for user {UserId}",
            request.ConversationIds.Count, request.UserId);

        if (request.ConversationIds.Count == 0)
        {
            return Result<int>.Failure(
                Error.Custom("BulkDelete.NoIds", "At least one conversation ID is required"));
        }

        try
        {
            var deletedCount = await _chatService.BulkDeleteConversationsAsync(
                request.ConversationIds,
                request.UserId,
                cancellationToken);

            _logger.LogInformation("Successfully deleted {DeletedCount} of {RequestedCount} conversations for user {UserId}",
                deletedCount, request.ConversationIds.Count, request.UserId);

            return Result<int>.Success(deletedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting conversations. Count: {Count}, UserId: {UserId}",
                request.ConversationIds.Count, request.UserId);
            return Result<int>.Failure(
                Error.Internal("Failed to delete conversations"));
        }
    }
}
