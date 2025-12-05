using Microsoft.AspNetCore.Mvc;
using SecondBrain.Core.Common;

namespace SecondBrain.API.Extensions;

/// <summary>
/// Extension methods for converting Result types to ActionResult
/// </summary>
public static class ResultExtensions
{
    /// <summary>
    /// Converts a Result&lt;T&gt; to an ActionResult
    /// </summary>
    public static ActionResult<T> ToActionResult<T>(this Result<T> result)
    {
        return result.Match<ActionResult<T>>(
            onSuccess: value => new OkObjectResult(value),
            onFailure: error => ToErrorActionResult<T>(error)
        );
    }

    /// <summary>
    /// Converts a Result&lt;T&gt; to an ActionResult with a specific success status code
    /// </summary>
    public static ActionResult<T> ToActionResult<T>(this Result<T> result, int successStatusCode)
    {
        return result.Match<ActionResult<T>>(
            onSuccess: value => new ObjectResult(value) { StatusCode = successStatusCode },
            onFailure: error => ToErrorActionResult<T>(error)
        );
    }

    /// <summary>
    /// Converts a Result&lt;T&gt; to a Created ActionResult with location
    /// </summary>
    public static ActionResult<T> ToCreatedResult<T>(this Result<T> result, string location)
    {
        return result.Match<ActionResult<T>>(
            onSuccess: value => new CreatedResult(location, value),
            onFailure: error => ToErrorActionResult<T>(error)
        );
    }

    /// <summary>
    /// Converts a Result (no value) to an ActionResult
    /// </summary>
    public static ActionResult ToActionResult(this Result result)
    {
        return result.Match(
            onSuccess: () => new NoContentResult(),
            onFailure: error => ToErrorActionResult(error)
        );
    }

    /// <summary>
    /// Converts a Result (no value) to an OkResult on success
    /// </summary>
    public static ActionResult ToOkResult(this Result result)
    {
        return result.Match(
            onSuccess: () => new OkResult(),
            onFailure: error => ToErrorActionResult(error)
        );
    }

    private static ActionResult<T> ToErrorActionResult<T>(Error error)
    {
        var problemDetails = new ProblemDetails
        {
            Title = error.Code,
            Detail = error.Message,
            Status = GetStatusCode(error.Code)
        };

        return new ObjectResult(problemDetails)
        {
            StatusCode = problemDetails.Status
        };
    }

    private static ActionResult ToErrorActionResult(Error error)
    {
        var problemDetails = new ProblemDetails
        {
            Title = error.Code,
            Detail = error.Message,
            Status = GetStatusCode(error.Code)
        };

        return new ObjectResult(problemDetails)
        {
            StatusCode = problemDetails.Status
        };
    }

    private static int GetStatusCode(string errorCode)
    {
        return errorCode switch
        {
            ErrorCodes.NotFound => StatusCodes.Status404NotFound,
            ErrorCodes.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorCodes.Forbidden => StatusCodes.Status403Forbidden,
            ErrorCodes.ValidationFailed => StatusCodes.Status400BadRequest,
            ErrorCodes.BadRequest => StatusCodes.Status400BadRequest,
            ErrorCodes.Conflict => StatusCodes.Status409Conflict,
            ErrorCodes.RateLimitExceeded => StatusCodes.Status429TooManyRequests,
            ErrorCodes.Timeout => StatusCodes.Status408RequestTimeout,
            ErrorCodes.ExternalServiceError => StatusCodes.Status502BadGateway,
            ErrorCodes.InternalError => StatusCodes.Status500InternalServerError,
            _ => StatusCodes.Status500InternalServerError
        };
    }
}
