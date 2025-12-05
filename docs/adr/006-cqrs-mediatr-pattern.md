# ADR 006: CQRS with MediatR

## Status

Accepted

## Context

As Second Brain grew, some service classes became large with mixed responsibilities:

- Query operations (read data)
- Command operations (create, update, delete)
- Cross-cutting concerns (logging, validation)

We needed a pattern that:

1. Separates read and write operations
2. Enables single-responsibility handlers
3. Provides a pipeline for cross-cutting concerns
4. Makes the codebase more testable
5. Supports eventual consistency patterns if needed

## Decision

We will use **CQRS (Command Query Responsibility Segregation)** implemented with **MediatR** for complex operations.

### Pattern Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Controller  │────▶│   MediatR    │────▶│   Handler   │
│             │     │  (Mediator)  │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Pipeline   │
                    │  Behaviors  │
                    └─────────────┘
                    - Logging
                    - Validation
                    - Transaction
```

### Command Example

```csharp
// Commands/Notes/CreateNote/CreateNoteCommand.cs
public record CreateNoteCommand(
    string Title,
    string Content,
    List<string> Tags,
    string? Folder,
    string UserId
) : IRequest<Result<NoteDto>>;

// Commands/Notes/CreateNote/CreateNoteCommandHandler.cs
public class CreateNoteCommandHandler 
    : IRequestHandler<CreateNoteCommand, Result<NoteDto>>
{
    private readonly INoteRepository _repository;
    
    public async Task<Result<NoteDto>> Handle(
        CreateNoteCommand request,
        CancellationToken cancellationToken)
    {
        var note = new Note
        {
            Id = Guid.NewGuid().ToString(),
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            Folder = request.Folder,
            UserId = request.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        
        var created = await _repository.CreateAsync(note);
        return Result<NoteDto>.Success(created.ToDto());
    }
}
```

### Query Example

```csharp
// Queries/Notes/GetNoteById/GetNoteByIdQuery.cs
public record GetNoteByIdQuery(string Id, string UserId) 
    : IRequest<Result<NoteDto>>;

// Queries/Notes/GetNoteById/GetNoteByIdQueryHandler.cs
public class GetNoteByIdQueryHandler 
    : IRequestHandler<GetNoteByIdQuery, Result<NoteDto>>
{
    private readonly INoteRepository _repository;
    
    public async Task<Result<NoteDto>> Handle(
        GetNoteByIdQuery request,
        CancellationToken cancellationToken)
    {
        var note = await _repository.GetByIdAsync(request.Id);
        
        if (note == null)
            return Result<NoteDto>.Failure(Error.NotFound("Note", request.Id));
        
        if (note.UserId != request.UserId)
            return Result<NoteDto>.Failure(Error.Unauthorized());
        
        return Result<NoteDto>.Success(note.ToDto());
    }
}
```

### Pipeline Behaviors

```csharp
// Behaviors/LoggingBehavior.cs
public class LoggingBehavior<TRequest, TResponse> 
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}", requestName);
        
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();
        
        _logger.LogInformation(
            "Handled {RequestName} in {ElapsedMs}ms",
            requestName,
            sw.ElapsedMilliseconds);
        
        return response;
    }
}

// Behaviors/ValidationBehavior.cs
public class ValidationBehavior<TRequest, TResponse> 
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;
    
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();
        
        var context = new ValidationContext<TRequest>(request);
        var failures = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        
        var errors = failures
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();
        
        if (errors.Any())
            throw new ValidationException(errors);
        
        return await next();
    }
}
```

### Controller Usage

```csharp
[ApiController]
[Route("api/v1/notes")]
public class NotesController : ControllerBase
{
    private readonly IMediator _mediator;
    
    [HttpPost]
    public async Task<IActionResult> CreateNote(CreateNoteRequest request)
    {
        var command = new CreateNoteCommand(
            request.Title,
            request.Content,
            request.Tags,
            request.Folder,
            UserId);
        
        var result = await _mediator.Send(command);
        return result.ToActionResult();
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetNote(string id)
    {
        var query = new GetNoteByIdQuery(id, UserId);
        var result = await _mediator.Send(query);
        return result.ToActionResult();
    }
}
```

## Consequences

### Positive

- **Single Responsibility** - Each handler does one thing
- **Testability** - Handlers can be tested in isolation
- **Cross-cutting concerns** - Pipeline behaviors handle logging, validation, etc.
- **Decoupling** - Controllers don't depend on services directly
- **Scalability** - Easy to add new commands/queries without modifying existing code
- **Audit trail** - Logging behavior captures all operations

### Negative

- **More files** - Each operation needs command/query + handler
- **Indirection** - Request flows through mediator
- **Learning curve** - Team needs to understand MediatR patterns
- **Overhead** - May be overkill for simple CRUD

### Neutral

- Not all operations need CQRS; simple cases can use services directly
- Commands and queries are in separate folders for organization
- Handlers registered automatically via assembly scanning
