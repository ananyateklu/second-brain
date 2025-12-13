using FluentValidation;

namespace SecondBrain.Application.Commands.RagAnalytics.SubmitFeedback;

/// <summary>
/// Validator for SubmitFeedbackCommand used by MediatR's ValidationBehavior
/// </summary>
public class SubmitFeedbackCommandValidator : AbstractValidator<SubmitFeedbackCommand>
{
    private static readonly string[] ValidFeedbackValues = { "thumbs_up", "thumbs_down", "positive", "negative" };
    private static readonly string[] ValidCategories = { "relevant", "irrelevant", "partial", "incorrect", "helpful", "not_helpful" };

    public SubmitFeedbackCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.LogId)
            .NotEmpty()
            .WithMessage("Log ID is required");

        RuleFor(x => x.Feedback)
            .NotEmpty()
            .WithMessage("Feedback is required")
            .Must(f => ValidFeedbackValues.Contains(f.ToLowerInvariant()))
            .WithMessage($"Feedback must be one of: {string.Join(", ", ValidFeedbackValues)}");

        RuleFor(x => x.Category)
            .Must(c => c == null || ValidCategories.Contains(c.ToLowerInvariant()))
            .WithMessage($"Category must be one of: {string.Join(", ", ValidCategories)}");

        RuleFor(x => x.Comment)
            .MaximumLength(1000)
            .When(x => !string.IsNullOrEmpty(x.Comment))
            .WithMessage("Comment must not exceed 1000 characters");
    }
}
