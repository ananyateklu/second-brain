using FluentValidation;

namespace SecondBrain.Application.Commands.Import.ImportNotes;

/// <summary>
/// Validator for ImportNotesCommand used by MediatR's ValidationBehavior
/// </summary>
public class ImportNotesCommandValidator : AbstractValidator<ImportNotesCommand>
{
    public ImportNotesCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.Notes)
            .NotNull()
            .WithMessage("Notes list cannot be null")
            .NotEmpty()
            .WithMessage("At least one note is required for import")
            .Must(notes => notes.Count <= 1000)
            .WithMessage("Cannot import more than 1000 notes at once");

        RuleForEach(x => x.Notes)
            .ChildRules(note =>
            {
                note.RuleFor(n => n.Title)
                    .NotEmpty()
                    .WithMessage("Note title is required")
                    .MaximumLength(500)
                    .WithMessage("Note title must not exceed 500 characters");

                note.RuleFor(n => n.Content)
                    .NotNull()
                    .WithMessage("Note content cannot be null")
                    .MaximumLength(1000000)
                    .WithMessage("Note content must not exceed 1,000,000 characters");

                note.RuleFor(n => n.Tags)
                    .Must(tags => tags == null || tags.Count <= 50)
                    .WithMessage("Maximum 50 tags allowed per note");
            });
    }
}
