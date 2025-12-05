using System.Reflection;
using FluentValidation;
using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Behaviors;

/// <summary>
/// Pipeline behavior that validates requests using FluentValidation before they reach the handler.
/// Returns a failed Result if validation fails, integrating with the Result pattern.
/// </summary>
/// <typeparam name="TRequest">The type of the request</typeparam>
/// <typeparam name="TResponse">The type of the response</typeparam>
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }

        var context = new ValidationContext<TRequest>(request);

        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count > 0)
        {
            // Check if the response type is Result<T> and return a failure result
            var responseType = typeof(TResponse);

            if (responseType.IsGenericType &&
                responseType.GetGenericTypeDefinition() == typeof(Result<>))
            {
                var errorMessage = string.Join("; ", failures.Select(f => f.ErrorMessage));
                var error = new Error("ValidationFailed", errorMessage);

                // Create Result<T>.Failure(error) using reflection
                var resultType = responseType;
                var failureMethod = resultType.GetMethod(
                    "Failure",
                    BindingFlags.Public | BindingFlags.Static,
                    null,
                    new[] { typeof(Error) },
                    null);

                if (failureMethod != null)
                {
                    return (TResponse)failureMethod.Invoke(null, new object[] { error })!;
                }
            }

            // Check if the response type is Result (non-generic) and return a failure result
            if (responseType == typeof(Result))
            {
                var errorMessage = string.Join("; ", failures.Select(f => f.ErrorMessage));
                var error = new Error("ValidationFailed", errorMessage);
                return (TResponse)(object)Result.Failure(error);
            }

            // For non-Result types, throw ValidationException
            var errorDictionary = failures
                .GroupBy(f => f.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(f => f.ErrorMessage).ToArray());

            throw new Exceptions.ValidationException(errorDictionary);
        }

        return await next();
    }
}
