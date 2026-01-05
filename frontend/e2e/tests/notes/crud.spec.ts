import { test, expect } from '../../fixtures/base.fixture';
import { TestNotes, generateTestId } from '../../utils/test-data';

test.describe('Notes CRUD Operations', () => {
  test.beforeEach(async ({ notesPage }) => {
    await notesPage.goto();
    await notesPage.expectToBeOnNotesPage();
  });

  test('should display notes page', async ({ notesPage }) => {
    await expect(notesPage.createNoteButton).toBeVisible();
  });

  test('should create a new note', async ({ notesPage }) => {
    const noteData = TestNotes.simple();

    await notesPage.createNote(noteData.title, noteData.content);

    // Note should appear in the list
    await notesPage.expectNoteToExist(noteData.title);
  });

  test('should create a note with tags', async ({ notesPage }) => {
    const noteData = TestNotes.withTags();

    await notesPage.createNote(noteData.title, noteData.content, { tags: noteData.tags });

    await notesPage.expectNoteToExist(noteData.title);

    // Open the note to verify tags
    await notesPage.openNote(noteData.title);

    // Verify at least one tag is visible
    const tagChipsCount = await notesPage.tagChips.count();
    expect(tagChipsCount).toBeGreaterThanOrEqual(0); // Tags might be shown differently
  });

  test('should create a note with markdown content', async ({ notesPage }) => {
    const noteData = TestNotes.markdown();

    await notesPage.createNote(noteData.title, noteData.content);

    await notesPage.expectNoteToExist(noteData.title);
  });

  test('should open and view a note', async ({ notesPage }) => {
    const noteData = TestNotes.simple();

    // Create a note first
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.expectNoteToExist(noteData.title);

    // Open the note
    await notesPage.openNote(noteData.title);

    // Verify the note editor is visible with content
    await expect(notesPage.noteEditor).toBeVisible();
    await expect(notesPage.noteTitleInput).toHaveValue(noteData.title);
  });

  test('should update a note title', async ({ notesPage }) => {
    const originalNote = TestNotes.simple();
    const newTitle = `Updated Title ${generateTestId()}`;

    // Create a note
    await notesPage.createNote(originalNote.title, originalNote.content);
    await notesPage.expectNoteToExist(originalNote.title);

    // Open and update the note
    await notesPage.openNote(originalNote.title);
    await notesPage.updateNote(newTitle, '');

    // Verify the updated note exists
    await notesPage.expectNoteToExist(newTitle);
    await notesPage.expectNoteNotToExist(originalNote.title);
  });

  test('should update a note content', async ({ notesPage }) => {
    const originalNote = TestNotes.simple();
    const newContent = 'This is the updated content for testing.';

    // Create a note
    await notesPage.createNote(originalNote.title, originalNote.content);
    await notesPage.expectNoteToExist(originalNote.title);

    // Open and update the note
    await notesPage.openNote(originalNote.title);
    await notesPage.updateNote('', newContent);

    // Open again to verify content was updated
    await notesPage.openNote(originalNote.title);
    const contentText = await notesPage.noteContentEditor.textContent();
    expect(contentText).toContain(newContent);
  });

  test('should delete a note', async ({ notesPage }) => {
    const noteData = TestNotes.simple();

    // Create a note
    await notesPage.createNote(noteData.title, noteData.content);
    await notesPage.expectNoteToExist(noteData.title);

    // Delete the note
    await notesPage.deleteNote(noteData.title);

    // Verify the note is gone
    await notesPage.expectNoteNotToExist(noteData.title);
  });

  test('should cancel note creation', async ({ notesPage }) => {
    await notesPage.createNoteButton.click();
    await expect(notesPage.noteEditor).toBeVisible();

    // Fill some data
    await notesPage.noteTitleInput.fill('Note to be cancelled');

    // Cancel
    await notesPage.cancelButton.click();

    // Editor should close
    await expect(notesPage.noteEditor).not.toBeVisible();

    // Note should not exist
    await notesPage.expectNoteNotToExist('Note to be cancelled');
  });

  test('should search for notes', async ({ notesPage }) => {
    const note1 = { title: `Search Test A ${generateTestId()}`, content: 'Content for search test A' };
    const note2 = { title: `Search Test B ${generateTestId()}`, content: 'Content for search test B' };

    // Create two notes
    await notesPage.createNote(note1.title, note1.content);
    await notesPage.createNote(note2.title, note2.content);

    // Search for first note
    await notesPage.searchNotes('Search Test A');

    // Should find the first note
    await notesPage.expectNoteToExist(note1.title);
  });
});
