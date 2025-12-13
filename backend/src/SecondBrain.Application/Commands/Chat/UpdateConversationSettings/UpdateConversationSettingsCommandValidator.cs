using FluentValidation;

namespace SecondBrain.Application.Commands.Chat.UpdateConversationSettings;

/// <summary>
/// Validator for UpdateConversationSettingsCommand used by MediatR's ValidationBehavior
/// </summary>
public class UpdateConversationSettingsCommandValidator : AbstractValidator<UpdateConversationSettingsCommand>
{
    private static readonly string[] ValidVectorStoreProviders = { "PostgreSQL", "Pinecone" };

    public UpdateConversationSettingsCommandValidator()
    {
        RuleFor(x => x.ConversationId)
            .NotEmpty()
            .WithMessage("Conversation ID is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.VectorStoreProvider)
            .Must(p => p == null || ValidVectorStoreProviders.Contains(p))
            .WithMessage($"Vector store provider must be one of: {string.Join(", ", ValidVectorStoreProviders)}");

        RuleFor(x => x.AgentCapabilities)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrEmpty(x.AgentCapabilities))
            .WithMessage("Agent capabilities must not exceed 2000 characters");
    }
}
