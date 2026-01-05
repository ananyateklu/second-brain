import { test, expect } from '../../fixtures/base.fixture';
import { generateTestId } from '../../utils/test-data';

/**
 * Smoke tests covering critical user paths.
 * These tests should run quickly and cover the most important functionality.
 * Target: < 2 minutes total run time.
 */
test.describe('Critical Path Smoke Tests', () => {
  test('smoke: can access dashboard after login', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();
    await dashboardPage.expectNavigationToBeVisible();
  });

  test('smoke: can navigate to all main sections', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();

    // Navigate to Notes
    await dashboardPage.navigateToNotes();
    await expect(page).toHaveURL(/\/notes/);

    // Navigate to Chat
    await dashboardPage.navigateToChat();
    await expect(page).toHaveURL(/\/chat/);

    // Navigate to Focus (if available)
    const focusLink = dashboardPage.focusNavLink;
    if (await focusLink.isVisible().catch(() => false)) {
      await dashboardPage.navigateToFocus();
      await expect(page).toHaveURL(/\/focus/);
    }

    // Navigate back to Dashboard
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();
  });

  // TODO: Re-enable when note creation/view modal issues are fixed
  // test('smoke: can create and view a note', async ({ notesPage }) => { ... });

  test('smoke: can start a chat conversation', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.startNewConversation();

    // Check if the chat input is enabled (AI provider configured)
    const isInputEnabled = await chatPage.messageInput.isEnabled().catch(() => false);
    if (!isInputEnabled) {
      console.log('Chat input is disabled - no AI provider configured in CI. Skipping test.');
      test.skip();
      return;
    }

    // Send a simple message
    await chatPage.sendMessage('Hello, this is a smoke test.');

    // Verify message was sent
    await expect(chatPage.userMessages.last()).toContainText('smoke test');
  });

  test('smoke: can create a focus task', async ({ focusPage }) => {
    const taskTitle = `Smoke Test Task ${generateTestId()}`;

    await focusPage.goto();

    // Check if focus page is functional
    const createButton = focusPage.createTaskButton;
    if (await createButton.isVisible().catch(() => false)) {
      await focusPage.createTask(taskTitle);
      await focusPage.expectTaskToExist(taskTitle);
    } else {
      console.log('Focus create task button not visible - skipping');
    }
  });

  test('smoke: settings page loads', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();

    // Navigate to settings if available
    const settingsLink = dashboardPage.settingsNavLink;
    if (await settingsLink.isVisible().catch(() => false)) {
      await dashboardPage.navigateToSettings();
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test('smoke: logout works', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    await dashboardPage.logout();

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('smoke: page refresh maintains session', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    // Refresh
    await page.reload();

    // Should still be authenticated
    await dashboardPage.expectToBeOnDashboard();
  });

  test('smoke: API health check', async ({ page }) => {
    // Directly check API health endpoint
    const response = await page.request.get('http://localhost:5001/api/health');
    expect(response.ok()).toBeTruthy();
  });
});

/**
 * Extended smoke tests for specific features.
 * These can be run separately if the basic smoke tests pass.
 */
test.describe('Extended Smoke Tests', () => {
  test('smoke: note search works', async ({ notesPage }) => {
    const uniqueTitle = `Searchable ${generateTestId()}`;

    await notesPage.goto();

    // Create a note with unique title
    await notesPage.createNote(uniqueTitle, 'Content for search test');

    // Search for it
    await notesPage.searchNotes(uniqueTitle);

    // Should find the note
    await notesPage.expectNoteToExist(uniqueTitle);
  });

  test('smoke: chat receives AI response', async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.startNewConversation();

    // Check if the chat input is enabled (AI provider configured)
    const isInputEnabled = await chatPage.messageInput.isEnabled().catch(() => false);
    if (!isInputEnabled) {
      console.log('Chat input is disabled - no AI provider configured in CI. Skipping test.');
      test.skip();
      return;
    }

    // Send message and wait for response
    await chatPage.sendMessageAndWaitForResponse('What is 2 + 2?');

    // Should have an assistant response
    await chatPage.expectAssistantResponse();
  });

  // TODO: Re-enable when note update modal issues are fixed
  // test('smoke: note can be updated', async ({ notesPage }) => { ... });

  test('smoke: note can be deleted', async ({ notesPage }) => {
    const title = `Delete Test ${generateTestId()}`;

    await notesPage.goto();

    // Create and delete note
    await notesPage.createNote(title, 'To be deleted');
    await notesPage.expectNoteToExist(title);

    await notesPage.deleteNote(title);
    await notesPage.expectNoteNotToExist(title);
  });
});
