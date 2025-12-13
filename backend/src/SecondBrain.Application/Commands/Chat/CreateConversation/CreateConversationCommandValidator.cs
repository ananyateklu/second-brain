using FluentValidation;

namespace SecondBrain.Application.Commands.Chat.CreateConversation;

/// <summary>
/// Validator for CreateConversationCommand used by MediatR's ValidationBehavior
/// </summary>
public class CreateConversationCommandValidator : AbstractValidator<CreateConversationCommand>
{
    private static readonly string[] ValidProviders = { "openai", "anthropic", "claude", "gemini", "ollama", "grok", "xai" };
    private static readonly string[] ValidVectorStoreProviders = { "PostgreSQL", "Pinecone" };

    public CreateConversationCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Conversation title is required")
            .MaximumLength(500)
            .WithMessage("Title must not exceed 500 characters");

        RuleFor(x => x.Provider)
            .NotEmpty()
            .WithMessage("Provider is required")
            .Must(p => ValidProviders.Contains(p.ToLowerInvariant()))
            .WithMessage($"Provider must be one of: {string.Join(", ", ValidProviders)}");

        RuleFor(x => x.Model)
            .NotEmpty()
            .WithMessage("Model is required")
            .MaximumLength(100)
            .WithMessage("Model name must not exceed 100 characters");

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
