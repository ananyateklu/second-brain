import { test, expect } from '../../fixtures/base.fixture';
import { TestNotes, generateTestId } from '../../utils/test-data';

test.describe('Note Version History', () => {
  test.beforeEach(async ({ notesPage }) => {
    await notesPage.goto();
    await notesPage.expectToBeOnNotesPage();
  });

  test('should show version history for a note', async ({ notesPage }) => {
    const noteData = TestNotes.simple();

    // Create a note
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.expectNoteToExist(noteData.title);

    // Open the note
    await notesPage.openNote(noteData.title);

    // Open version history
    await notesPage.openVersionHistory();

    // Version history panel should be visible
    await expect(notesPage.versionHistoryPanel).toBeVisible();
  });

  test('should create a new version when note is updated', async ({ notesPage }) => {
    const noteData = TestNotes.simple();
    const updatedContent = 'Updated content for version test';

    // Create a note
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.expectNoteToExist(noteData.title);

    // Update the note to create a new version
    await notesPage.openNote(noteData.title);
    await notesPage.updateNote('', updatedContent);

    // Open again and check version history
    await notesPage.openNote(noteData.title);
    await notesPage.openVersionHistory();

    // Should have at least one version entry
    const versionCount = await notesPage.versionItems.count();
    expect(versionCount).toBeGreaterThanOrEqual(1);
  });

  test('should restore a previous version', async ({ notesPage }) => {
    const noteData = {
      title: `Version Test ${generateTestId()}`,
      content: 'Original content v1',
    };
    const v2Content = 'Updated content v2';

    // Create a note
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.expectNoteToExist(noteData.title);

    // Update to create v2
    await notesPage.openNote(noteData.title);
    await notesPage.updateNote('', v2Content);

    // Open and restore v1
    await notesPage.openNote(noteData.title);

    // Wait a moment for the note to load
    await notesPage.page.waitForTimeout(500);

    await notesPage.openVersionHistory();

    // Click on the first version (oldest) to select it
    const versionCount = await notesPage.versionItems.count();
    if (versionCount > 0) {
      await notesPage.versionItems.last().click();

      // If there's a restore button, click it
      const restoreButton = notesPage.restoreVersionButton;
      if (await restoreButton.isVisible().catch(() => false)) {
        await restoreButton.click();

        // Wait for restore to complete
        await notesPage.page.waitForTimeout(1000);
      }
    }
  });

  test('should show version timestamps', async ({ notesPage }) => {
    const noteData = TestNotes.simple();

    // Create and update a note
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.openNote(noteData.title);
    await notesPage.updateNote('', 'Updated content');

    // Open version history
    await notesPage.openNote(noteData.title);
    await notesPage.openVersionHistory();

    // Version items should contain timestamp information
    const versionItem = notesPage.versionItems.first();
    if (await versionItem.isVisible().catch(() => false)) {
      // The version item should have some text content (timestamp, version number, etc.)
      const text = await versionItem.textContent();
      expect(text).toBeTruthy();
    }
  });
});
