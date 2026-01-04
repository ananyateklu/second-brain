import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Notes page.
 */
export class NotesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get createNoteButton() {
    // Create button in sticky sidebar - has title="Create New Note" when collapsed
    return this.page.locator('aside.sticky button[title="Create New Note"], aside.sticky button:has-text("Create New Note")').first();
  }

  get notesList() {
    return this.page.locator('[data-testid="notes-list"], .notes-list');
  }

  get noteCards() {
    // Note cards use cursor-pointer and rounded-3xl (full variant) or rounded-xl (micro)
    return this.page.locator('div.cursor-pointer[class*="rounded-"]');
  }

  get searchInput() {
    return this.page.locator('input[placeholder*="Search" i], input[type="search"], [data-testid="notes-search"]');
  }

  get emptyState() {
    return this.page.locator('[data-testid="empty-state"], .empty-state');
  }

  // Note editor/modal
  get noteEditor() {
    // The create note modal is a Dialog component with role="dialog"
    return this.page.locator('[role="dialog"]');
  }

  get noteTitleInput() {
    // Title input has id="title" and placeholder="Untitled"
    return this.page.locator('input#title, input[placeholder="Untitled"]');
  }

  get noteContentEditor() {
    // TipTap/ProseMirror editor with contenteditable
    // The editor renders as .tiptap containing .ProseMirror with contenteditable
    return this.page.locator('.ProseMirror[contenteditable="true"]').first();
  }

  get saveNoteButton() {
    // The save button text is "Create Note" for new notes or "Update" for existing notes
    return this.page.locator('[role="dialog"] button:has-text("Create Note"), [role="dialog"] button:has-text("Update")');
  }

  get cancelButton() {
    return this.page.locator('button:has-text("Cancel"), [data-testid="cancel"]');
  }

  get deleteNoteButton() {
    // Delete button is on the note card (not in modal) and has aria-label
    return this.page.locator('button[aria-label="Delete note"]');
  }

  get confirmDeleteButton() {
    // Toast confirmation uses role="alert" with action buttons
    // The "Delete" button is inside the toast alert
    return this.page.locator('[role="alert"] button:has-text("Delete")').first();
  }

  // Version history
  get versionHistoryButton() {
    return this.page.locator('button:has-text("History"), button:has-text("Versions"), [data-testid="version-history"]');
  }

  get versionHistoryPanel() {
    return this.page.locator('[data-testid="version-history-panel"], .version-history-panel');
  }

  get versionItems() {
    return this.page.locator('[data-testid="version-item"], .version-item');
  }

  get restoreVersionButton() {
    return this.page.locator('button:has-text("Restore"), [data-testid="restore-version"]');
  }

  // Tags
  get tagsInput() {
    return this.page.locator('input[placeholder*="Tag" i], [data-testid="tags-input"]');
  }

  get tagChips() {
    return this.page.locator('[data-testid="tag-chip"], .tag-chip');
  }

  // Folders
  get folderSelect() {
    return this.page.locator('[data-testid="folder-select"], select[name="folder"]');
  }

  // Actions
  async goto() {
    await super.goto('/notes');
  }

  async createNote(title: string, content: string, options?: { tags?: string[]; folder?: string }) {
    await this.scrollAndClick(this.createNoteButton);
    await expect(this.noteEditor).toBeVisible({ timeout: 10000 });

    // Wait for the title input to be ready and fill it
    const titleInput = this.noteTitleInput;
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.clear();
    await titleInput.fill(title);
    // Verify the title was set
    await expect(titleInput).toHaveValue(title);

    // Handle TipTap ProseMirror editor - use keyboard typing for contenteditable
    const contentEditor = this.noteContentEditor;
    await expect(contentEditor).toBeVisible({ timeout: 5000 });
    await contentEditor.click();
    // For contenteditable, use keyboard.type instead of fill
    await this.page.keyboard.type(content);

    // Add tags if provided
    if (options?.tags) {
      for (const tag of options.tags) {
        await this.tagsInput.fill(tag);
        await this.page.keyboard.press('Enter');
      }
    }

    // Select folder if provided
    if (options?.folder) {
      await this.folderSelect.selectOption(options.folder);
    }

    await this.saveNoteButton.click();
    await expect(this.noteEditor).not.toBeVisible({ timeout: 10000 });
    // Wait for the note list to update after creation
    await this.page.waitForTimeout(1000);
  }

  async openNote(title: string) {
    const noteCard = this.noteCards.filter({ hasText: title }).first();
    await noteCard.click();
    await expect(this.noteEditor).toBeVisible();
  }

  async updateNote(newTitle?: string, newContent?: string) {
    // TipTap/contenteditable works better with Playwright's keyboard events than
    // react-hook-form controlled inputs. So we prioritize content updates.

    let madeChanges = false;

    // Update content if provided - TipTap editors work well with keyboard events
    if (newContent) {
      const contentEditor = this.noteContentEditor;
      await expect(contentEditor).toBeVisible({ timeout: 5000 });
      await contentEditor.click();
      // Select all and delete existing content (Playwright uses Meta for macOS, Control for others)
      // Using ControlOrMeta modifier works cross-platform
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.press('Backspace');
      // Type new content - this triggers TipTap's onChange which updates react-hook-form
      await this.page.keyboard.type(newContent);
      madeChanges = true;
    }

    // Update title if provided - add content to ensure form becomes dirty
    if (newTitle) {
      // Also append some content to ensure TipTap triggers form dirty state
      if (!newContent) {
        const contentEditor = this.noteContentEditor;
        await expect(contentEditor).toBeVisible({ timeout: 5000 });
        await contentEditor.click();
        // Add a space and some text to trigger dirty state via TipTap
        await this.page.keyboard.press('End');
        await this.page.keyboard.type(' [updated]');
        madeChanges = true;
      }

      // Update title using clear and fill
      const titleInput = this.noteTitleInput;
      await titleInput.clear();
      await titleInput.fill(newTitle);
    }

    if (!madeChanges) {
      throw new Error('updateNote called without newTitle or newContent');
    }

    // Wait for React state to update and form to register as dirty
    await this.page.waitForTimeout(500);

    // Find and click the Update button (in header, appears when form is dirty)
    const updateButton = this.page.locator('[role="dialog"] button:has-text("Update")');
    await expect(updateButton).toBeVisible({ timeout: 5000 });
    await updateButton.click();

    // Wait for the mutation to complete
    await this.page.waitForTimeout(2000);

    // Close the modal manually since it stays open after save
    const closeButton = this.page.locator('[role="dialog"] button[title="Close"]');
    await closeButton.click();

    await expect(this.noteEditor).not.toBeVisible({ timeout: 10000 });
  }

  async deleteNote(title: string) {
    // Delete button is on the note card itself, not in modal
    const noteCard = this.noteCards.filter({ hasText: title }).first();
    await expect(noteCard).toBeVisible({ timeout: 5000 });

    // Hover to reveal the delete button (it's hidden by default with opacity-0)
    await noteCard.hover();
    await this.page.waitForTimeout(500); // Wait for opacity transition

    // Click the delete button within this card
    const deleteBtn = noteCard.locator('button[aria-label="Delete note"]');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // Wait for the confirmation toast to appear
    // The toast uses role="alert" and has an action button with the confirmText
    const confirmBtn = this.page.locator('[role="alert"] button').filter({ hasText: 'Delete' }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for the toast to dismiss and API to complete
    await this.page.waitForTimeout(1000);

    // Wait for the note to be removed from the list (soft delete)
    await expect(this.noteCards.filter({ hasText: title })).not.toBeVisible({ timeout: 10000 });
  }

  async searchNotes(query: string) {
    await this.fillField(this.searchInput, query);
    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  async openVersionHistory() {
    await this.versionHistoryButton.click();
    await expect(this.versionHistoryPanel).toBeVisible();
  }

  async restoreVersion(versionIndex: number = 0) {
    await this.openVersionHistory();
    await this.versionItems.nth(versionIndex).click();
    await this.restoreVersionButton.click();
    await expect(this.versionHistoryPanel).not.toBeVisible({ timeout: 10000 });
  }

  // Assertions
  async expectToBeOnNotesPage() {
    await expect(this.page).toHaveURL(/\/notes/);
  }

  async expectNoteToExist(title: string) {
    await expect(this.noteCards.filter({ hasText: title })).toBeVisible();
  }

  async expectNoteNotToExist(title: string) {
    await expect(this.noteCards.filter({ hasText: title })).not.toBeVisible();
  }

  async expectNotesCount(count: number) {
    await expect(this.noteCards).toHaveCount(count);
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }
}
