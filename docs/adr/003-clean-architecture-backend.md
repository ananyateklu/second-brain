# ADR 003: Clean Architecture for Backend

## Status

Accepted

## Context

Second Brain's backend needs to support:

- Multiple AI providers (OpenAI, Anthropic, Gemini, Ollama, X.AI)
- Multiple vector stores (PostgreSQL pgvector, Pinecone)
- Complex business logic (RAG pipeline, agent execution)
- Database operations with Entity Framework Core
- REST API endpoints

We needed an architecture that:

1. Separates concerns clearly
2. Makes the codebase testable
3. Allows swapping implementations (e.g., different AI providers)
4. Scales with feature complexity
5. Follows SOLID principles

## Decision

We will use **Clean Architecture** (also known as Onion Architecture) with four layers:

```
┌─────────────────────────────────────┐
│            API Layer                │  ← Controllers, Middleware
├─────────────────────────────────────┤
│        Application Layer            │  ← Services, DTOs, Commands/Queries
├─────────────────────────────────────┤
│           Core Layer                │  ← Entities, Interfaces, Domain Logic
├─────────────────────────────────────┤
│      Infrastructure Layer           │  ← Database, External Services
└─────────────────────────────────────┘
```

### Layer Responsibilities

**SecondBrain.API** (Presentation)

- HTTP controllers and endpoints
- Request/response mapping
- Authentication middleware
- Error handling middleware
- Swagger documentation

**SecondBrain.Application** (Business Logic)

- Service implementations
- CQRS Commands and Queries (via MediatR)
- DTOs and mappers
- Validation (FluentValidation)
- AI provider factories
- RAG pipeline orchestration

**SecondBrain.Core** (Domain)

- Entity definitions (Note, User, ChatConversation)
- Repository interfaces
- Domain exceptions
- Value objects

**SecondBrain.Infrastructure** (Data Access)

- Entity Framework DbContext
- Repository implementations
- Database migrations
- Vector store implementations
- External service integrations

### Dependency Rule

Dependencies flow inward:

- API → Application → Core ← Infrastructure
- Core has no dependencies on other layers
- Infrastructure implements Core interfaces

```csharp
// Core defines the interface
public interface INoteRepository
{
    Task<Note?> GetByIdAsync(string id);
    Task<Note> CreateAsync(Note note);
}

// Infrastructure implements it
public class SqlNoteRepository : INoteRepository
{
    private readonly ApplicationDbContext _context;
    // Implementation...
}

// Application uses the interface
public class NoteService
{
    private readonly INoteRepository _repository;
    // Business logic using repository...
}
```

## Consequences

### Positive

- **Testability** - Core and Application layers can be unit tested in isolation
- **Flexibility** - Easy to swap implementations (e.g., different databases)
- **Maintainability** - Clear boundaries reduce coupling
- **Scalability** - New features fit naturally into the structure
- **SOLID compliance** - Dependency Inversion is built into the architecture

### Negative

- **More files** - More projects and abstractions than simple architectures
- **Indirection** - Need to navigate through layers to understand flow
- **Overhead** - May be overkill for simple CRUD operations
- **Learning curve** - Team needs to understand the layer responsibilities

### Neutral

- Requires discipline to maintain layer boundaries
- DTOs create mapping overhead but enforce contract stability
