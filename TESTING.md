# Testing Guide for Second Brain

Comprehensive testing documentation covering unit tests, integration tests, E2E tests, and more.

## Quick Start

```bash
# Backend unit tests
cd backend && dotnet test

# Frontend unit tests
cd frontend && pnpm test

# E2E tests (requires running backend + frontend)
cd frontend && pnpm e2e

# Smoke tests only (fast)
cd frontend && pnpm e2e:smoke
```

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     E2E Tests (Playwright)                   │
│  Full user flows: Auth, Notes CRUD, Chat, Focus             │
├─────────────────────────────────────────────────────────────┤
│                   Integration Tests                          │
│  Backend: API endpoints, Database, Repositories             │
│  Frontend: MSW mocked service calls                         │
├─────────────────────────────────────────────────────────────┤
│                      Unit Tests                              │
│  Backend: xUnit + Moq + FluentAssertions                    │
│  Frontend: Vitest + React Testing Library                   │
└─────────────────────────────────────────────────────────────┘
```

## Backend Tests

### Location
- `backend/tests/SecondBrain.Tests.Unit/` - Unit tests
- `backend/tests/SecondBrain.Tests.Integration/` - Integration tests with PostgreSQL
- `backend/tests/SecondBrain.Tests.Integration.Agent/` - Agent evaluation tests

### Frameworks
- **xUnit 2.9.3** - Test framework
- **Moq 4.20.72** - Mocking
- **FluentAssertions 8.8.0** - Assertions
- **Testcontainers** - PostgreSQL containers for integration tests
- **Bogus** - Test data generation

### Running Tests

```bash
cd backend

# Run all tests
dotnet test

# Run unit tests only
dotnet test tests/SecondBrain.Tests.Unit/

# Run integration tests
dotnet test tests/SecondBrain.Tests.Integration/

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test
dotnet test --filter "FullyQualifiedName~NotesApiTests"
```

### Test Patterns

#### Controller Test
```csharp
[Fact]
public async Task CreateNote_WithValidRequest_ReturnsCreated()
{
    // Arrange
    var request = new CreateNoteRequest { Title = "Test", Content = "Content" };

    // Act
    var response = await _client.PostAsJsonAsync("/api/notes", request);

    // Assert
    response.StatusCode.Should().Be(HttpStatusCode.Created);
}
```

#### Service Test with Mocks
```csharp
public class NoteServiceTests
{
    private readonly Mock<INoteRepository> _mockRepo;
    private readonly NoteService _sut;

    public NoteServiceTests()
    {
        _mockRepo = new Mock<INoteRepository>();
        _sut = new NoteService(_mockRepo.Object);
    }

    [Fact]
    public async Task GetById_ReturnsNote()
    {
        _mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(new Note { Id = "1", Title = "Test" });

        var result = await _sut.GetByIdAsync("1");

        result.Should().NotBeNull();
    }
}
```

## Frontend Tests

### Location
- `frontend/src/**/__tests__/` - Component and hook tests
- `frontend/src/services/__tests__/` - Service tests
- `frontend/src/store/__tests__/` - Store tests

### Frameworks
- **Vitest 4.x** - Test runner
- **React Testing Library** - Component testing
- **MSW 2.x** - API mocking
- **@testing-library/user-event** - User interaction simulation

### Running Tests

```bash
cd frontend

# Watch mode
pnpm test

# Single run
pnpm test:run

# With coverage
pnpm test:coverage

# Specific file
pnpm test -- notes.test.ts
```

### Test Patterns

#### Component Test
```typescript
import { render, screen } from '@/test/test-utils';
import { NoteCard } from './NoteCard';

test('renders note title', () => {
  render(<NoteCard note={createMockNote({ title: 'Test Note' })} />);
  expect(screen.getByText('Test Note')).toBeInTheDocument();
});
```

#### Hook Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useNotes } from './use-notes';

test('fetches notes', async () => {
  const { result } = renderHook(() => useNotes(), { wrapper });

  await waitFor(() => {
    expect(result.current.data).toHaveLength(2);
  });
});
```

#### Service Test with MSW
```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

test('handles error response', async () => {
  server.use(
    http.get('/api/notes', () => HttpResponse.json({ error: 'Failed' }, { status: 500 }))
  );

  await expect(notesService.getAll()).rejects.toThrow();
});
```

## E2E Tests

### Location
- `frontend/e2e/` - Playwright E2E tests

### Structure
```
e2e/
├── fixtures/           # Extended test fixtures
├── page-objects/       # Page Object Model classes
├── tests/
│   ├── auth/           # Authentication tests
│   ├── notes/          # Notes CRUD tests
│   ├── chat/           # Chat streaming tests
│   ├── focus/          # Focus task tests
│   └── smoke/          # Critical path smoke tests
├── utils/              # Test helpers
└── visual/             # Visual regression tests
```

### Running Tests

```bash
cd frontend

# All E2E tests
pnpm e2e

# With UI (recommended for development)
pnpm e2e:ui

# Headed mode (see browser)
pnpm e2e:headed

# Debug mode
pnpm e2e:debug

# Smoke tests only
pnpm e2e:smoke

# View report
pnpm e2e:report
```

### Prerequisites

1. Backend running: `http://localhost:5001`
2. Frontend running: `http://localhost:3000`
3. Test user created:
   - Email: `e2e-test@example.com`
   - Password: `E2ETestPassword123!`

### Test Pattern

```typescript
import { test, expect } from '../fixtures/base.fixture';

test.describe('Notes', () => {
  test('creates a note', async ({ notesPage }) => {
    await notesPage.goto();
    await notesPage.createNote('Test Note', 'Content');
    await notesPage.expectNoteToExist('Test Note');
  });
});
```

## Visual Regression Tests

```bash
# Run visual tests
pnpm e2e:visual

# Update baselines
pnpm e2e:visual:update
```

Screenshots are stored in `e2e/visual/__screenshots__/`.

## Performance Tests

### Location
- `performance/k6/` - k6 load tests

### Prerequisites
```bash
# Install k6
brew install k6  # macOS
```

### Running Tests

```bash
# Smoke test (10 VUs, 1 min)
k6 run -e BASE_URL=http://localhost:5001 performance/k6/scripts/smoke.js

# Load test (50 VUs, 5 min)
k6 run -e BASE_URL=http://localhost:5001 performance/k6/scripts/load.js
```

### Thresholds

| Test | p95 Response | Error Rate |
|------|--------------|------------|
| Smoke | < 500ms | < 1% |
| Load | < 1000ms | < 2% |

## Contract Testing

### Generating Types
```bash
# Backend must be running
./contracts/generate-types.sh
```

Types are generated to `frontend/src/types/api-generated.ts`.

## CI/CD Integration

### Backend Tests (`.github/workflows/backend-tests.yml`)
- Runs on push to `main`/`develop` and PRs
- Unit tests with coverage
- Integration tests with PostgreSQL container

### Frontend Tests (`.github/workflows/frontend-tests.yml`)
- Runs on push to `main`/`develop` and PRs
- Unit tests with Vitest
- Coverage reports

### E2E Tests (`.github/workflows/e2e-tests.yml`)
- Full E2E suite on push to `main`
- Smoke tests on PRs
- Artifacts: Playwright report, screenshots

## Test Data

### Backend
- Use `Bogus` for fake data
- `WebApplicationFactoryFixture` provides authenticated client

### Frontend
- `createMockNote()`, `createMockUser()` in `test-utils.tsx`
- MSW handlers in `test/mocks/handlers.ts`

### E2E
- `TestNotes`, `TestConversations`, `TestFocusItems` generators
- `generateTestId()` for unique test data

## Best Practices

### General
1. Tests should be independent and isolated
2. Use descriptive test names
3. Follow AAA pattern (Arrange-Act-Assert)
4. Clean up test data after tests

### Backend
1. Use `[Collection("WebApplication")]` for shared fixture
2. Implement `IAsyncLifetime` for setup/teardown
3. Use `Should()` assertions from FluentAssertions

### Frontend
1. Use custom `render` from `test-utils.tsx`
2. Query by role/text, not implementation details
3. Use `waitFor` for async operations
4. Mock at service boundary, not implementation

### E2E
1. Use Page Objects for reusable interactions
2. Use `data-testid` for stable selectors
3. Wait for elements properly (no arbitrary timeouts)
4. Create test data via API when possible

## Troubleshooting

### Backend Integration Tests Failing
- Check PostgreSQL is running
- Verify `ConnectionStrings__DefaultConnection` env var
- Check database extensions are installed

### Frontend Tests Failing
- Ensure MSW handlers match API calls
- Check for React act() warnings
- Verify query client is fresh per test

### E2E Tests Failing
- Verify backend and frontend are running
- Check test user credentials
- View trace files for debugging: `pnpm exec playwright show-trace`

## Coverage Reports

- Backend: `backend/coverage-report/` (HTML)
- Frontend: `frontend/coverage/` (HTML)
- E2E: `frontend/playwright-report/` (HTML)

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [xUnit Documentation](https://xunit.net/docs/getting-started/netcore/cmdline)
- [k6 Documentation](https://k6.io/docs/)
