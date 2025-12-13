using FluentValidation;

namespace SecondBrain.Application.Commands.Notes.BulkDeleteNotes;

/// <summary>
/// Validator for BulkDeleteNotesCommand used by MediatR's ValidationBehavior
/// </summary>
public class BulkDeleteNotesCommandValidator : AbstractValidator<BulkDeleteNotesCommand>
{
    public BulkDeleteNotesCommandValidator()
    {
        RuleFor(x => x.NoteIds)
            .NotNull()
            .WithMessage("Note IDs list cannot be null")
            .NotEmpty()
            .WithMessage("At least one note ID is required")
            .Must(ids => ids.Count <= 100)
            .WithMessage("Cannot delete more than 100 notes at once")
            .Must(ids => ids.All(id => !string.IsNullOrWhiteSpace(id)))
            .WithMessage("All note IDs must be non-empty");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
    }
}
