# User Memory - Second Brain Project

> **Last Updated**: 2026-01-04
> **Developer**: Ananya Teklu

---

## Developer Preferences

### Code Style

- **Frontend**: Functional components, arrow functions, strict TypeScript
- **Backend**: `Result<T>` pattern, CQRS (MediatR), FluentValidation
- **Git**: Conventional commits (`feat:`, `fix:`, `refactor:`), max 400 lines/PR

### State & Data

- Zustand selectors (never destructure full store)
- TanStack Query for server state
- Composite hooks for complex page state

---

## Environment

| Component | Details |
|-----------|---------|
| **OS** | macOS (Apple Silicon) |
| **Ports** | Frontend: 3000, Backend: 5001, Docker PG: 5432, Desktop PG: 5433 |
| **Secrets** | 1Password vault "Second Brain Dev", never commit `.env` |

---

## Critical Reminders

- **Soft deletes**: Filter `WHERE is_deleted = false` on: `notes`, `chat_conversations`, `focus_items`, `focus_suggestions`
- **Array columns**: Use `'tag' = ANY(tags)` not `tags = 'tag'`
- **User preferences**: 13-file update required (see `@.claude/rules/workflows.md`)
- **Store persistence**: Check `partialize` + `merge` in `bound-store.ts` for new state

---

## UI Styling Patterns

### Frosted Glass (Blue Theme)

Use `color-mix()` CSS function for transparent tints:

| Use Case | Value |
|----------|-------|
| Floating containers | `var(--glass-bg)` + `backdrop-blur: 20px` |
| Buttons/inputs | `color-mix(in srgb, var(--text-primary) 8%, transparent)` |
| Hover states | `color-mix(in srgb, var(--text-primary) 10%, transparent)` |
| Borders/dividers | `color-mix(in srgb, var(--text-primary) 15%, transparent)` |
| Error states | `color-mix(in srgb, var(--color-error) 20%, transparent)` + red text |
| Selected states | Solid `var(--color-brand-600)` + white text |

Glass variables defined in `surfaces.css`:
- `--glass-bg`, `--glass-header`, `--glass-body`

---

## Quick Commands

```bash
# Database
./database/migrate.sh status        # Check migration state
./database/migrate.sh diff          # Compare Docker vs Desktop

# Development
dotnet watch run                    # Backend hot reload
pnpm dev                            # Frontend dev server
pnpm tauri dev                      # Desktop app

# Testing
dotnet test && pnpm test            # Run all tests
```

---

## Current Focus

- [ ] Real-time collaboration (WebSocket/CRDT)
- [ ] Offline-first with service workers

---

## References

For detailed patterns and troubleshooting:

- Code patterns: `@.claude/rules/backend/architecture.md`, `@.claude/rules/frontend/architecture.md`
- AI providers: `@.claude/rules/backend/ai-providers.md`
- Database: `@.claude/rules/database/schema.md`, `@.claude/rules/database/queries.md`
- Troubleshooting: `@.claude/troubleshooting.md`

---

**Remember**: Keep this minimal. Put session work in `.claude/session.md`.
