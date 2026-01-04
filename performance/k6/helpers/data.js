/**
 * Test data generators for k6 performance tests.
 */

/**
 * Generate a unique ID for test data.
 */
export function generateId() {
  return `k6-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a test note.
 */
export function generateNote() {
  const id = generateId();
  return {
    title: `Performance Test Note ${id}`,
    content: `This is a performance test note created at ${new Date().toISOString()}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    tags: ['perf-test', 'k6'],
  };
}

/**
 * Generate a test conversation.
 */
export function generateConversation() {
  const id = generateId();
  return {
    title: `Performance Test Chat ${id}`,
    provider: 'openai',
    model: 'gpt-4o-mini',
  };
}

/**
 * Generate a test focus item.
 */
export function generateFocusItem() {
  const id = generateId();
  return {
    title: `Performance Test Task ${id}`,
    priority: Math.floor(Math.random() * 3) + 1,
    description: 'Created by k6 performance test',
  };
}

/**
 * Generate a test message for chat.
 */
export function generateMessage() {
  const messages = [
    'What is the capital of France?',
    'Explain quantum computing in simple terms.',
    'Write a haiku about testing.',
    'What are the benefits of TypeScript?',
    'How do I optimize database queries?',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate random search query.
 */
export function generateSearchQuery() {
  const queries = [
    'project notes',
    'meeting summary',
    'todo list',
    'ideas',
    'research',
  ];
  return queries[Math.floor(Math.random() * queries.length)];
}
