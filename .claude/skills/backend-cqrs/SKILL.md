---
name: backend-cqrs
description: ASP.NET Core development with CQRS, Result pattern, and Clean Architecture. Use when user asks to build API endpoints, commands, queries, handlers, or services in the backend. Triggers on C# backend code, MediatR patterns, Result<T> handling, or controller implementations.
---

# Backend CQRS Development

## Architecture (Clean Architecture - 4 Layers)

```text
backend/src/
├── SecondBrain.API/           # Controllers, Middleware, DI
├── SecondBrain.Application/   # CQRS Commands/Queries, Services
├── SecondBrain.Core/          # Entities, Interfaces, Result<T>
└── SecondBrain.Infrastructure/ # Repositories, DbContext
```

## CQRS Pattern with MediatR

### Commands (State Changes)

Location: `Application/Commands/{Domain}/{Operation}/`

```csharp
// 1. Define Command
public record CreateNoteCommand(
    string Title,
    string Content,
    string? Folder,
    List<string>? Tags,
    string UserId
) : IRequest<Result<NoteResponse>>;

// 2. Create Handler
public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteRepository _noteRepository;

    public CreateNoteCommandHandler(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;
    }

    public async Task<Result<NoteResponse>> Handle(CreateNoteCommand request, CancellationToken ct)
    {
        // Business logic here
        var note = Note.Create(request.Title, request.Content, request.UserId);
        await _noteRepository.AddAsync(note, ct);

        return Result<NoteResponse>.Success(NoteResponse.FromEntity(note));
    }
}
```

### Queries (Read Operations)

Location: `Application/Queries/{Domain}/{Operation}/`

```csharp
public record GetNoteByIdQuery(string NoteId, string UserId) : IRequest<Result<NoteResponse>>;

public class GetNoteByIdQueryHandler : IRequestHandler<GetNoteByIdQuery, Result<NoteResponse>>
{
    public async Task<Result<NoteResponse>> Handle(GetNoteByIdQuery request, CancellationToken ct)
    {
        var note = await _noteRepository.GetByIdAsync(request.NoteId, ct);

        if (note is null || note.IsDeleted)
            return Result<NoteResponse>.Failure(Error.NotFound("Note not found"));

        if (note.UserId != request.UserId)
            return Result<NoteResponse>.Failure(Error.Forbidden("Access denied"));

        return Result<NoteResponse>.Success(NoteResponse.FromEntity(note));
    }
}
```

## Result Pattern

**CRITICAL**: All handlers return `Result<T>`, controllers use `.Match()`

```csharp
// In handlers - return success or failure
return Result<T>.Success(data);
return Result<T>.Failure(Error.NotFound("Resource not found"));
return Result<T>.Failure(Error.Validation("Invalid input"));
return Result<T>.Failure(Error.Forbidden("Access denied"));

// In controllers - match and return HTTP status
[HttpGet("{id}")]
public async Task<IActionResult> GetNote(string id)
{
    var userId = User.GetUserId();
    var result = await _mediator.Send(new GetNoteByIdQuery(id, userId));

    return result.Match(
        onSuccess: note => Ok(note),
        onFailure: error => error.Code switch
        {
            "NotFound" => NotFound(error),
            "Forbidden" => Forbid(),
            _ => BadRequest(error)
        }
    );
}
```

## Controller Pattern

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotesController(IMediator mediator) => _mediator = mediator;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        var userId = User.GetUserId();
        var command = new CreateNoteCommand(
            request.Title,
            request.Content,
            request.Folder,
            request.Tags,
            userId
        );

        var result = await _mediator.Send(command);

        return result.Match(
            onSuccess: note => CreatedAtAction(nameof(GetById), new { id = note.Id }, note),
            onFailure: error => BadRequest(error)
        );
    }
}
```

## AI Provider Factory

```csharp
// Get AI providers via factory
IAIProvider provider = _aiProviderFactory.GetProvider("OpenAI");  // or Anthropic, Gemini, Grok, Ollama
IImageGenerationProvider imgProvider = _imageProviderFactory.GetProvider("Gemini");
IEmbeddingProvider embedProvider = _embeddingProviderFactory.GetProvider("Cohere");
```

## Agent Streaming Strategy

```csharp
var strategy = _strategyFactory.GetStrategy(request.Provider);
await foreach (var @event in strategy.ExecuteAsync(context, ct))
    yield return @event;
```

SSE Events: `start`, `message`, `rag`, `tool`, `thinking`, `end`, `error`

## Pipeline Behaviors

- `LoggingBehavior` - Logs all requests/responses
- `ValidationBehavior` - Validates commands via FluentValidation

## Key Files Reference

| File | Purpose |
|------|---------|
| `Program.cs` | Entry, DI, database init |
| `Extensions/ServiceCollectionExtensions.cs` | Service registrations |
| `Controllers/ChatController.cs` | Chat/RAG/streaming |
| `Controllers/AgentController.cs` | Agent streaming |
| `Services/Agents/AgentService.cs` | Agent orchestration |
| `Services/RAG/RagService.cs` | RAG pipeline |
| `Data/ApplicationDbContext.cs` | EF Core config |

## Common Commands

```bash
cd backend/src/SecondBrain.API && dotnet watch run    # Dev server (port 5001)
cd backend && dotnet test                              # Run tests
dotnet ef migrations add MigrationName                 # Add migration
```
