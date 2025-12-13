using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.RagAnalytics.SubmitFeedback;

/// <summary>
/// Handler for SubmitFeedbackCommand
/// </summary>
public class SubmitFeedbackCommandHandler : IRequestHandler<SubmitFeedbackCommand, Result<bool>>
{
    private readonly IRagAnalyticsService _analyticsService;
    private readonly IRagQueryLogRepository _repository;
    private readonly IChatRepository _chatRepository;
    private readonly ILogger<SubmitFeedbackCommandHandler> _logger;

    public SubmitFeedbackCommandHandler(
        IRagAnalyticsService analyticsService,
        IRagQueryLogRepository repository,
        IChatRepository chatRepository,
        ILogger<SubmitFeedbackCommandHandler> logger)
    {
        _analyticsService = analyticsService;
        _repository = repository;
        _chatRepository = chatRepository;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        SubmitFeedbackCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Submitting RAG feedback. LogId: {LogId}, UserId: {UserId}",
            request.LogId, request.UserId);

        try
        {
            // Verify the log exists and belongs to the user
            var log = await _repository.GetByIdAsync(request.LogId);
            if (log == null)
            {
                return Result<bool>.Failure(Error.NotFound($"RAG query log '{request.LogId}' not found"));
            }

            if (log.UserId != request.UserId)
            {
                _logger.LogWarning(
                    "User attempted to submit feedback for another user's RAG query. UserId: {UserId}, LogId: {LogId}",
                    request.UserId, request.LogId);
                return Result<bool>.Failure(Error.Custom("Forbidden", "Access denied"));
            }

            await _analyticsService.UpdateFeedbackAsync(
                request.LogId,
                request.Feedback,
                request.Category,
                request.Comment,
                cancellationToken);

            // Also update the chat message with the feedback for persistence across page reloads
            if (!string.IsNullOrEmpty(log.ConversationId))
            {
                var conversation = await _chatRepository.GetByIdAsync(log.ConversationId);
                if (conversation != null)
                {
                    // Find the message with this ragLogId and update its feedback
                    var message = conversation.Messages.FirstOrDefault(m => m.RagLogId == request.LogId.ToString());
                    if (message != null)
                    {
                        message.RagFeedback = request.Feedback;
                        await _chatRepository.UpdateAsync(log.ConversationId, conversation);
                        _logger.LogDebug("Updated chat message feedback. MessageId: {MessageId}", message.Id);
                    }
                }
            }

            _logger.LogInformation(
                "RAG feedback submitted. LogId: {LogId}, Feedback: {Feedback}, Category: {Category}",
                request.LogId, request.Feedback, request.Category);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting RAG feedback. LogId: {LogId}", request.LogId);
            return Result<bool>.Failure(Error.Internal("Failed to submit feedback"));
        }
    }
}
