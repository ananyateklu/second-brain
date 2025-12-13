using FluentValidation;

namespace SecondBrain.Application.Commands.Notes.DeleteNote;

/// <summary>
/// Validator for DeleteNoteCommand used by MediatR's ValidationBehavior
/// </summary>
public class DeleteNoteCommandValidator : AbstractValidator<DeleteNoteCommand>
{
    public DeleteNoteCommandValidator()
    {
        RuleFor(x => x.NoteId)
            .NotEmpty()
            .WithMessage("Note ID is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
    }
}
