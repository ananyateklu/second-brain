using FluentValidation;
using SecondBrain.Application.DTOs.Requests;

namespace SecondBrain.Application.Validators;

/// <summary>
/// Validator for UpdateNoteRequest
/// </summary>
public class UpdateNoteRequestValidator : AbstractValidator<UpdateNoteRequest>
{
    public UpdateNoteRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .WithMessage("Title is required")
            .MaximumLength(500)
            .WithMessage("Title must not exceed 500 characters");

        RuleFor(x => x.Content)
            .NotNull()
            .WithMessage("Content cannot be null")
            .MaximumLength(1000000)
            .WithMessage("Content must not exceed 1,000,000 characters");

        RuleFor(x => x.Tags)
            .NotNull()
            .WithMessage("Tags list cannot be null")
            .Must(tags => tags.Count <= 50)
            .WithMessage("Maximum 50 tags allowed")
            .Must(tags => tags.All(tag => !string.IsNullOrWhiteSpace(tag) && tag.Length <= 100))
            .WithMessage("Each tag must be non-empty and not exceed 100 characters");

        RuleFor(x => x.Folder)
            .MaximumLength(200)
            .When(x => !string.IsNullOrEmpty(x.Folder))
            .WithMessage("Folder name must not exceed 200 characters");
    }
}

