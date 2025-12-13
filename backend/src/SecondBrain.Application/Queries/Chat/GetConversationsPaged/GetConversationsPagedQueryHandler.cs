using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Common;
using SecondBrain.Application.Services.Chat;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetConversationsPaged;

/// <summary>
/// Handler for GetConversationsPagedQuery
/// </summary>
public class GetConversationsPagedQueryHandler : IRequestHandler<GetConversationsPagedQuery, Result<PaginatedResult<ChatConversation>>>
{
    private readonly IChatConversationService _chatService;
    private readonly ILogger<GetConversationsPagedQueryHandler> _logger;

    public GetConversationsPagedQueryHandler(
        IChatConversationService chatService,
        ILogger<GetConversationsPagedQueryHandler> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task<Result<PaginatedResult<ChatConversation>>> Handle(
        GetConversationsPagedQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting paginated conversations. UserId: {UserId}, Page: {Page}, PageSize: {PageSize}",
            request.UserId, request.Page, request.PageSize);

        try
        {
            var result = await _chatService.GetConversationsPagedAsync(
                request.UserId,
                request.Page,
                request.PageSize,
                cancellationToken);

            return Result<PaginatedResult<ChatConversation>>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving paginated conversations. UserId: {UserId}, Page: {Page}, PageSize: {PageSize}",
                request.UserId, request.Page, request.PageSize);
            return Result<PaginatedResult<ChatConversation>>.Failure(
                Error.Internal("Failed to retrieve conversations"));
        }
    }
}
