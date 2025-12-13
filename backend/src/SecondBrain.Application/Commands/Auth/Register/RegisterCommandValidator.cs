using FluentValidation;

namespace SecondBrain.Application.Commands.Auth.Register;

/// <summary>
/// Validator for RegisterCommand used by MediatR's ValidationBehavior
/// </summary>
public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required")
            .EmailAddress()
            .WithMessage("Invalid email format")
            .MaximumLength(256)
            .WithMessage("Email must not exceed 256 characters");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required")
            .MinimumLength(8)
            .WithMessage("Password must be at least 8 characters")
            .MaximumLength(128)
            .WithMessage("Password must not exceed 128 characters")
            .Matches(@"[A-Z]")
            .WithMessage("Password must contain at least one uppercase letter")
            .Matches(@"[a-z]")
            .WithMessage("Password must contain at least one lowercase letter")
            .Matches(@"[0-9]")
            .WithMessage("Password must contain at least one digit");

        RuleFor(x => x.Username)
            .MaximumLength(50)
            .When(x => !string.IsNullOrEmpty(x.Username))
            .WithMessage("Username must not exceed 50 characters")
            .Matches(@"^[a-zA-Z0-9_-]+$")
            .When(x => !string.IsNullOrEmpty(x.Username))
            .WithMessage("Username can only contain letters, numbers, underscores, and hyphens");

        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .When(x => !string.IsNullOrEmpty(x.DisplayName))
            .WithMessage("Display name must not exceed 100 characters");
    }
}
