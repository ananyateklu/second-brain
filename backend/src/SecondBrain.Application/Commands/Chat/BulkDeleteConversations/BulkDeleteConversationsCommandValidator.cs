using FluentValidation;

namespace SecondBrain.Application.Commands.Chat.BulkDeleteConversations;

/// <summary>
/// Validator for BulkDeleteConversationsCommand used by MediatR's ValidationBehavior
/// </summary>
public class BulkDeleteConversationsCommandValidator : AbstractValidator<BulkDeleteConversationsCommand>
{
    public BulkDeleteConversationsCommandValidator()
    {
        RuleFor(x => x.ConversationIds)
            .NotNull()
            .WithMessage("Conversation IDs list cannot be null")
            .NotEmpty()
            .WithMessage("At least one conversation ID is required")
            .Must(ids => ids.Count <= 100)
            .WithMessage("Cannot delete more than 100 conversations at once")
            .Must(ids => ids.All(id => !string.IsNullOrWhiteSpace(id)))
            .WithMessage("All conversation IDs must be non-empty");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
    }
}
