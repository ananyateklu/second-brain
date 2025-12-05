namespace SecondBrain.Core.Common;

/// <summary>
/// Represents the result of an operation that can either succeed with a value or fail with an error.
/// This pattern provides explicit error handling without exceptions for expected failure cases.
/// </summary>
/// <typeparam name="T">The type of the success value</typeparam>
public class Result<T>
{
    /// <summary>
    /// Indicates whether the operation was successful
    /// </summary>
    public bool IsSuccess { get; }

    /// <summary>
    /// Indicates whether the operation failed
    /// </summary>
    public bool IsFailure => !IsSuccess;

    /// <summary>
    /// The success value (only valid when IsSuccess is true)
    /// </summary>
    public T? Value { get; }

    /// <summary>
    /// The error (only valid when IsFailure is true)
    /// </summary>
    public Error? Error { get; }

    private Result(T value)
    {
        IsSuccess = true;
        Value = value;
        Error = null;
    }

    private Result(Error error)
    {
        IsSuccess = false;
        Value = default;
        Error = error;
    }

    /// <summary>
    /// Creates a successful result with the given value
    /// </summary>
    /// <exception cref="ArgumentNullException">Thrown when value is null</exception>
    public static Result<T> Success(T value)
    {
        ArgumentNullException.ThrowIfNull(value, nameof(value));
        return new(value);
    }

    /// <summary>
    /// Creates a failed result with the given error
    /// </summary>
    public static Result<T> Failure(Error error) => new(error);

    /// <summary>
    /// Creates a failed result with the given error code and message
    /// </summary>
    public static Result<T> Failure(string code, string message) => new(new Error(code, message));

    /// <summary>
    /// Pattern matches on the result, executing the appropriate function based on success or failure
    /// </summary>
    public TResult Match<TResult>(
        Func<T, TResult> onSuccess,
        Func<Error, TResult> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error!);

    /// <summary>
    /// Pattern matches on the result asynchronously
    /// </summary>
    public async Task<TResult> MatchAsync<TResult>(
        Func<T, Task<TResult>> onSuccess,
        Func<Error, Task<TResult>> onFailure)
        => IsSuccess ? await onSuccess(Value!) : await onFailure(Error!);

    /// <summary>
    /// Transforms the success value using the provided function
    /// </summary>
    public Result<TNew> Map<TNew>(Func<T, TNew> mapper)
        => IsSuccess ? Result<TNew>.Success(mapper(Value!)) : Result<TNew>.Failure(Error!);

    /// <summary>
    /// Transforms the success value using the provided async function
    /// </summary>
    public async Task<Result<TNew>> MapAsync<TNew>(Func<T, Task<TNew>> mapper)
        => IsSuccess ? Result<TNew>.Success(await mapper(Value!)) : Result<TNew>.Failure(Error!);

    /// <summary>
    /// Chains another operation that returns a Result
    /// </summary>
    public Result<TNew> Bind<TNew>(Func<T, Result<TNew>> binder)
        => IsSuccess ? binder(Value!) : Result<TNew>.Failure(Error!);

    /// <summary>
    /// Chains another async operation that returns a Result
    /// </summary>
    public async Task<Result<TNew>> BindAsync<TNew>(Func<T, Task<Result<TNew>>> binder)
        => IsSuccess ? await binder(Value!) : Result<TNew>.Failure(Error!);

    /// <summary>
    /// Returns the success value or the specified default value if failed
    /// </summary>
    public T GetValueOrDefault(T defaultValue = default!)
        => IsSuccess ? Value! : defaultValue;

    /// <summary>
    /// Returns the success value or throws an exception if failed
    /// </summary>
    public T GetValueOrThrow()
        => IsSuccess ? Value! : throw new InvalidOperationException(Error?.Message ?? "Operation failed");

    /// <summary>
    /// Implicit conversion from value to successful Result.
    /// </summary>
    /// <exception cref="ArgumentNullException">Thrown when value is null. Use Result&lt;T&gt;.Failure() for error cases.</exception>
    public static implicit operator Result<T>(T value)
    {
        ArgumentNullException.ThrowIfNull(value, nameof(value));
        return Success(value);
    }

    /// <summary>
    /// Implicit conversion from Error to failed Result
    /// </summary>
    public static implicit operator Result<T>(Error error) => Failure(error);
}

/// <summary>
/// Represents a result with no value (for void operations)
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error? Error { get; }

    private Result(bool isSuccess, Error? error = null)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true);
    public static Result Failure(Error error) => new(false, error);
    public static Result Failure(string code, string message) => new(false, new Error(code, message));

    public TResult Match<TResult>(
        Func<TResult> onSuccess,
        Func<Error, TResult> onFailure)
        => IsSuccess ? onSuccess() : onFailure(Error!);

    public async Task<TResult> MatchAsync<TResult>(
        Func<Task<TResult>> onSuccess,
        Func<Error, Task<TResult>> onFailure)
        => IsSuccess ? await onSuccess() : await onFailure(Error!);

    public static implicit operator Result(Error error) => Failure(error);
}
