# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) for the Second Brain project. ADRs are documents that capture important architectural decisions made during the development of the project.

## What is an ADR?

An Architecture Decision Record is a document that captures an important architectural decision along with its context and consequences. ADRs help teams:

- **Document decisions** - Keep a record of why certain architectural choices were made
- **Share knowledge** - Help new team members understand the reasoning behind the architecture
- **Track evolution** - See how the architecture has evolved over time
- **Avoid revisiting decisions** - Prevent repeated discussions about decisions already made

## ADR Template

When creating a new ADR, use the following template:

```markdown
# ADR XXX: Title

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

### Positive

- Benefit 1
- Benefit 2

### Negative

- Drawback 1
- Drawback 2

### Neutral

- Side effect 1
```

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-zustand-for-client-state.md) | Zustand for Client State Management | Accepted | 2025-12 |
| [002](002-tanstack-query-for-server-state.md) | TanStack Query for Server State | Accepted | 2025-12 |
| [003](003-clean-architecture-backend.md) | Clean Architecture for Backend | Accepted | 2025-12 |
| [004](004-ai-provider-factory-pattern.md) | AI Provider Factory Pattern | Accepted | 2025-12 |
| [005](005-result-pattern-error-handling.md) | Result Pattern for Error Handling | Accepted | 2025-12 |
| [006](006-cqrs-mediatr-pattern.md) | CQRS with MediatR | Accepted | 2025-12 |
| [007](007-tauri-macos-desktop-app.md) | Tauri macOS Desktop App | Accepted | 2025-12 |
| [008](008-ios-shortcuts-integration.md) | iOS Shortcuts Integration | Accepted | 2025-12 |
| [009](009-opentelemetry-observability.md) | OpenTelemetry Observability | Accepted | 2025-12 |
| [010](010-hybridcache-distributed-caching.md) | HybridCache for Distributed Caching | Accepted | 2025-12 |
| [011](011-backend-performance-optimizations.md) | Backend Performance Optimizations | Accepted | 2025-12 |
| [012](012-postgresql-18-temporal-features.md) | PostgreSQL 18 Temporal Features | Accepted | 2025-12 |
| [014](014-agent-streaming-strategy-pattern.md) | Agent Streaming Strategy Pattern | Accepted | 2025-12-11 |

## Creating a New ADR

1. Copy the template above
2. Create a new file with the format `XXX-short-title.md`
3. Fill in the sections
4. Update this README's index
5. Submit for review

## References

- [Michael Nygard's ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
