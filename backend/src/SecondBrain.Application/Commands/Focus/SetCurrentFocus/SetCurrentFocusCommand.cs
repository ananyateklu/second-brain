using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Focus.SetCurrentFocus;

/// <summary>
/// Command to set a focus item as the user's current focus.
/// Clears any existing current focus before setting the new one.
/// </summary>
public record SetCurrentFocusCommand(
    string FocusItemId,
    string UserId
) : IRequest<Result<FocusItemResponse>>;
