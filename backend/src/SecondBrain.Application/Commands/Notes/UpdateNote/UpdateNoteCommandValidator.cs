using FluentValidation;

namespace SecondBrain.Application.Commands.Notes.UpdateNote;

/// <summary>
/// Validator for UpdateNoteCommand used by MediatR's ValidationBehavior
/// </summary>
public class UpdateNoteCommandValidator : AbstractValidator<UpdateNoteCommand>
{
    public UpdateNoteCommandValidator()
    {
        RuleFor(x => x.NoteId)
            .NotEmpty()
            .WithMessage("Note ID is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.Title)
            .MaximumLength(500)
            .When(x => x.Title != null)
            .WithMessage("Title must not exceed 500 characters");

        RuleFor(x => x.Content)
            .MaximumLength(1000000)
            .When(x => x.Content != null)
            .WithMessage("Content must not exceed 1,000,000 characters");

        RuleFor(x => x.Tags)
            .Cascade(CascadeMode.Stop)
            .Must(tags => tags == null || tags.Count <= 50)
            .WithMessage("Maximum 50 tags allowed")
            .Must(tags => tags == null || tags.All(tag => !string.IsNullOrWhiteSpace(tag) && tag.Length <= 100))
            .When(x => x.Tags != null)
            .WithMessage("Each tag must be non-empty and not exceed 100 characters");

        RuleFor(x => x.Folder)
            .MaximumLength(200)
            .When(x => !string.IsNullOrEmpty(x.Folder))
            .WithMessage("Folder name must not exceed 200 characters");
    }
}
