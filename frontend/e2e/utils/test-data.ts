/**
 * Test data generators and constants for E2E tests.
 */

/**
 * Generate a unique test ID to avoid collisions between test runs.
 */
export function generateTestId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique email for test users.
 */
export function generateTestEmail(): string {
  return `e2e-test-${generateTestId()}@example.com`;
}

/**
 * Test user credentials.
 */
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'E2ETestPassword123!',
  displayName: 'E2E Test User',
};

/**
 * Test note data generators.
 */
export const TestNotes = {
  simple: () => ({
    title: `Test Note ${generateTestId()}`,
    content: 'This is a test note content for E2E testing.',
  }),

  withTags: () => ({
    title: `Tagged Note ${generateTestId()}`,
    content: 'This note has tags for testing tag functionality.',
    tags: ['e2e-test', 'automation'],
  }),

  withFolder: (folder: string) => ({
    title: `Folder Note ${generateTestId()}`,
    content: 'This note is in a specific folder.',
    folder,
  }),

  markdown: () => ({
    title: `Markdown Note ${generateTestId()}`,
    content: `# Heading 1

## Heading 2

This is **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

\`\`\`javascript
const test = "code block";
\`\`\`
`,
  }),

  long: () => ({
    title: `Long Note ${generateTestId()}`,
    content: Array(50).fill('This is a paragraph of content for testing long notes. ').join('\n\n'),
  }),
};

/**
 * Test conversation data generators.
 */
export const TestConversations = {
  simple: () => ({
    title: `Test Chat ${generateTestId()}`,
    provider: 'openai',
    model: 'gpt-4o-mini',
  }),

  withRag: () => ({
    title: `RAG Chat ${generateTestId()}`,
    provider: 'openai',
    model: 'gpt-4o-mini',
    ragEnabled: true,
  }),

  withAgent: () => ({
    title: `Agent Chat ${generateTestId()}`,
    provider: 'openai',
    model: 'gpt-4o-mini',
    agentEnabled: true,
  }),
};

/**
 * Test focus item data generators.
 */
export const TestFocusItems = {
  simple: () => ({
    title: `Test Task ${generateTestId()}`,
    priority: 2,
  }),

  highPriority: () => ({
    title: `Urgent Task ${generateTestId()}`,
    priority: 1,
    description: 'This is a high priority task for testing.',
  }),

  lowPriority: () => ({
    title: `Low Priority Task ${generateTestId()}`,
    priority: 3,
  }),

  scheduled: (date: string) => ({
    title: `Scheduled Task ${generateTestId()}`,
    priority: 2,
    scheduledDate: date,
  }),
};

/**
 * Test messages for chat.
 */
export const TestMessages = {
  simple: 'Hello, this is a test message.',
  question: 'What is the capital of France?',
  codeRequest: 'Write a simple JavaScript function that adds two numbers.',
  ragQuery: 'What do my notes say about testing?',
  agentTask: 'Create a new note titled "Agent Created Note" with the content "This was created by an agent."',
};

/**
 * Format a date for the scheduled date input.
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date formatted for input.
 */
export function getTodayForInput(): string {
  return formatDateForInput(new Date());
}

/**
 * Get tomorrow's date formatted for input.
 */
export function getTomorrowForInput(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForInput(tomorrow);
}
