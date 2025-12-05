# ADR 005: Result Pattern for Error Handling

## Status

Accepted

## Context

Second Brain needs robust error handling for operations that can fail:

- Database operations (not found, constraint violations)
- AI provider calls (rate limits, timeouts, invalid responses)
- User input validation
- Authorization checks

Traditional exception-based error handling has drawbacks:

1. Exceptions are expensive to throw and catch
2. Control flow via exceptions is hard to follow
3. Easy to forget to handle specific exception types
4. Exceptions don't appear in method signatures

We needed a pattern that:

1. Makes errors explicit in the type system
2. Forces callers to handle error cases
3. Provides structured error information
4. Works well with async operations
5. Integrates cleanly with API responses

## Decision

We will use the **Result Pattern** for domain operations that can fail in expected ways.

### Result Types

```csharp
// Core/Common/Result.cs
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public Error? Error { get; }
    
    private Result(T value)
    {
        IsSuccess = true;
        Value = value;
    }
    
    private Result(Error error)
    {
        IsSuccess = false;
        Error = error;
    }
    
    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(Error error) => new(error);
    
    public TResult Match<TResult>(
        Func<T, TResult> onSuccess,
        Func<Error, TResult> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error!);
}

public record Error(string Code, string Message)
{
    public static Error NotFound(string entity, string id) 
        => new("NotFound", $"{entity} with ID '{id}' was not found");
    
    public static Error Unauthorized(string message = "Access denied")
        => new("Unauthorized", message);
    
    public static Error Validation(string message)
        => new("Validation", message);
    
    public static Error Conflict(string message)
        => new("Conflict", message);
}
```

### Service Layer Usage

```csharp
public class NoteService : INoteService
{
    public async Task<Result<NoteDto>> GetByIdAsync(string id, string userId)
    {
        var note = await _repository.GetByIdAsync(id);
        
        if (note == null)
            return Result<NoteDto>.Failure(Error.NotFound("Note", id));
        
        if (note.UserId != userId)
            return Result<NoteDto>.Failure(Error.Unauthorized());
        
        return Result<NoteDto>.Success(note.ToDto());
    }
}
```

### Controller Integration

```csharp
// API/Extensions/ResultExtensions.cs
public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        return result.Match(
            onSuccess: value => new OkObjectResult(value),
            onFailure: error => error.Code switch
            {
                "NotFound" => new NotFoundObjectResult(error),
                "Unauthorized" => new UnauthorizedObjectResult(error),
                "Validation" => new BadRequestObjectResult(error),
                "Conflict" => new ConflictObjectResult(error),
                _ => new ObjectResult(error) { StatusCode = 500 }
            }
        );
    }
}

// Usage in controller
[HttpGet("{id}")]
public async Task<IActionResult> GetNote(string id)
{
    var result = await _noteService.GetByIdAsync(id, UserId);
    return result.ToActionResult();
}
```

### When to Use Results vs Exceptions

| Scenario | Use |
|----------|-----|
| Entity not found | Result |
| Validation failure | Result |
| Authorization denied | Result |
| Business rule violation | Result |
| Database connection failure | Exception |
| Unexpected null reference | Exception |
| Configuration missing | Exception |
| Programming error | Exception |

## Consequences

### Positive

- **Type safety** - Compiler ensures error handling
- **Explicit errors** - Error cases visible in method signatures
- **No exception overhead** - Results are just objects
- **Composable** - Can chain operations with Match/Map
- **Testable** - Easy to assert on Result values
- **Consistent API responses** - Errors map to HTTP status codes

### Negative

- **Verbosity** - More code than try/catch in simple cases
- **Learning curve** - Team needs to understand functional patterns
- **Mixing paradigms** - Some operations still throw exceptions

### Neutral

- Exceptions still used for truly exceptional cases (infrastructure failures)
- Result pattern used for domain/business logic failures
- Requires discipline to use consistently across the codebase
