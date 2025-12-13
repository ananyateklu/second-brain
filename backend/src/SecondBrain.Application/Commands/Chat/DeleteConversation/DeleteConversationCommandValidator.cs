using FluentValidation;

namespace SecondBrain.Application.Commands.Chat.DeleteConversation;

/// <summary>
/// Validator for DeleteConversationCommand used by MediatR's ValidationBehavior
/// </summary>
public class DeleteConversationCommandValidator : AbstractValidator<DeleteConversationCommand>
{
    public DeleteConversationCommandValidator()
    {
        RuleFor(x => x.ConversationId)
            .NotEmpty()
            .WithMessage("Conversation ID is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
    }
}
