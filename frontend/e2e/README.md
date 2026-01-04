# E2E Tests

End-to-end tests for Second Brain using [Playwright](https://playwright.dev/).

## Quick Start

### Prerequisites

1. Backend running on `http://localhost:5001`
2. Frontend running on `http://localhost:3000`
3. Test user created with credentials:
   - Email: `e2e-test@example.com`
   - Password: `E2ETestPassword123!`

### Running Tests

```bash
# Run all E2E tests
pnpm e2e

# Run tests with UI (recommended for development)
pnpm e2e:ui

# Run tests in headed mode (see browser)
pnpm e2e:headed

# Run tests in debug mode
pnpm e2e:debug

# View test report
pnpm e2e:report
```

### Running Specific Tests

```bash
# Run only smoke tests
pnpm exec playwright test smoke

# Run only auth tests
pnpm exec playwright test auth

# Run only notes tests
pnpm exec playwright test notes

# Run only chat tests
pnpm exec playwright test chat

# Run a specific test file
pnpm exec playwright test login.spec.ts
```

## Test Structure

```
e2e/
├── fixtures/
│   └── base.fixture.ts      # Extended test with page objects
├── page-objects/
│   ├── base.page.ts         # Common page methods
│   ├── login.page.ts        # Login page interactions
│   ├── dashboard.page.ts    # Dashboard page
│   ├── notes.page.ts        # Notes CRUD operations
│   ├── chat.page.ts         # Chat conversations
│   └── focus.page.ts        # Focus/productivity
├── tests/
│   ├── auth/                # Authentication tests
│   ├── notes/               # Notes CRUD tests
│   ├── chat/                # Chat streaming tests
│   ├── focus/               # Focus task tests
│   └── smoke/               # Critical path smoke tests
├── utils/
│   ├── api-helpers.ts       # Direct API calls
│   ├── test-data.ts         # Test data generators
│   └── wait-helpers.ts      # Custom wait utilities
├── global-setup.ts          # Authentication setup
├── global-teardown.ts       # Cleanup
└── .auth/                   # Stored auth state (gitignored)
```

## Writing Tests

### Using Page Objects

```typescript
import { test, expect } from '../fixtures/base.fixture';

test('should create a note', async ({ notesPage }) => {
  await notesPage.goto();
  await notesPage.createNote('Test Note', 'Test content');
  await notesPage.expectNoteToExist('Test Note');
});
```

### Using Test Data Generators

```typescript
import { TestNotes, generateTestId } from '../utils/test-data';

test('should create note with tags', async ({ notesPage }) => {
  const noteData = TestNotes.withTags();
  await notesPage.createNote(noteData.title, noteData.content, {
    tags: noteData.tags,
  });
});
```

### Using API Helpers for Setup

```typescript
test('should display existing notes', async ({ api, notesPage }) => {
  // Create test data via API
  await api.createNote('API Created Note', 'Content');

  // Then test the UI
  await notesPage.goto();
  await notesPage.expectNoteToExist('API Created Note');
});
```

## Page Object Pattern

Each page object extends `BasePage` with common utilities:

```typescript
class NotesPage extends BasePage {
  // Locators as getters
  get createNoteButton() {
    return this.page.locator('[data-testid="create-note"]');
  }

  // Actions
  async createNote(title: string, content: string) {
    await this.createNoteButton.click();
    // ...
  }

  // Assertions
  async expectNoteToExist(title: string) {
    await expect(this.noteCards.filter({ hasText: title })).toBeVisible();
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:3000` | Frontend URL |
| `E2E_API_URL` | `http://localhost:5001/api` | Backend API URL |
| `E2E_TEST_EMAIL` | `e2e-test@example.com` | Test user email |
| `E2E_TEST_PASSWORD` | `E2ETestPassword123!` | Test user password |

## CI/CD

E2E tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`

### Smoke Tests
- Run on every PR
- Fast subset of critical paths
- ~2 minute target

### Full E2E Suite
- Runs on push to main branches
- Complete test coverage
- ~15 minute target

## Debugging

### View Test Traces

Failed tests generate traces viewable at:
```bash
pnpm exec playwright show-trace test-results/.../trace.zip
```

### Screenshot on Failure

Screenshots are automatically captured on test failure and saved to `test-results/`.

### Debug Mode

```bash
pnpm e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

## Best Practices

1. **Use `data-testid` attributes** for stable selectors
2. **Keep tests independent** - each test should set up its own data
3. **Use page objects** for reusable page interactions
4. **Wait for elements properly** - use `expect().toBeVisible()` not arbitrary timeouts
5. **Clean up test data** - use `api.cleanup*()` methods in teardown
6. **Use descriptive test names** that explain the user action
