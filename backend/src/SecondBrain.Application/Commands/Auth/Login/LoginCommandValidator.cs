using FluentValidation;

namespace SecondBrain.Application.Commands.Auth.Login;

/// <summary>
/// Validator for LoginCommand used by MediatR's ValidationBehavior
/// </summary>
public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Identifier)
            .NotEmpty()
            .WithMessage("Email or username is required")
            .MaximumLength(256)
            .WithMessage("Identifier must not exceed 256 characters");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required")
            .MaximumLength(128)
            .WithMessage("Password must not exceed 128 characters");
    }
}
