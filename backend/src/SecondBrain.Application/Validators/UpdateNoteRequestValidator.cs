using FluentValidation;
using SecondBrain.Application.DTOs.Requests;

namespace SecondBrain.Application.Validators;

/// <summary>
/// Validator for UpdateNoteRequest.
/// Only validates fields that are provided (not null) since this DTO supports partial updates.
/// </summary>
public class UpdateNoteRequestValidator : AbstractValidator<UpdateNoteRequest>
{
    public UpdateNoteRequestValidator()
    {
        // Only validate Title if provided
        RuleFor(x => x.Title)
            .NotEmpty()
            .When(x => x.Title != null)
            .WithMessage("Title cannot be empty when provided")
            .MaximumLength(500)
            .When(x => x.Title != null)
            .WithMessage("Title must not exceed 500 characters");

        // Only validate Content if provided
        RuleFor(x => x.Content)
            .MaximumLength(1000000)
            .When(x => x.Content != null)
            .WithMessage("Content must not exceed 1,000,000 characters");

        // Only validate Tags if provided
        RuleFor(x => x.Tags)
            .Must(tags => tags!.Count <= 50)
            .When(x => x.Tags != null)
            .WithMessage("Maximum 50 tags allowed")
            .Must(tags => tags!.All(tag => !string.IsNullOrWhiteSpace(tag) && tag.Length <= 100))
            .When(x => x.Tags != null)
            .WithMessage("Each tag must be non-empty and not exceed 100 characters");

        // Only validate Folder if provided and not empty
        RuleFor(x => x.Folder)
            .MaximumLength(200)
            .When(x => !string.IsNullOrEmpty(x.Folder))
            .WithMessage("Folder name must not exceed 200 characters");
    }
}

