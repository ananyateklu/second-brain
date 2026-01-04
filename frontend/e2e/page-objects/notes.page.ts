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
    await expect(noteCard).toBeVisible({ timeout: 5000 });
    await noteCard.click();

    // Wait for the dialog to appear
    await expect(this.noteEditor).toBeVisible({ timeout: 10000 });

    // Wait for loading state to complete - EditNoteModal shows "Loading note..." while fetching
    // The loading state shows a spinner and "Loading note..." text
    // We need to wait for either:
    // 1. The loading text to disappear (fast path - loading is done)
    // 2. The form content to appear (content loaded)
    // Use Promise.race to handle both scenarios
    const loadingText = this.page.locator('[role="dialog"]').getByText('Loading note...');
    const formContent = this.page.locator('input#title, .ProseMirror[contenteditable="true"]');

    // First, give the dialog a moment to show its content
    await this.page.waitForTimeout(500);

    // If loading text is visible, wait for it to disappear
    if (await loadingText.isVisible().catch(() => false)) {
      await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    }

    // Now wait for the form content to be visible
    await expect(formContent.first()).toBeVisible({ timeout: 15000 });

    // Additional wait for form to be fully rendered
    await this.page.waitForTimeout(500);
  }

  async updateNote(newTitle?: string, newContent?: string) {
    // TipTap/contenteditable works better with Playwright's keyboard events than
    // react-hook-form controlled inputs. So we prioritize content updates.

    // First ensure the dialog and form content are fully loaded
    await expect(this.noteEditor).toBeVisible({ timeout: 5000 });
    await this.page.waitForSelector('.ProseMirror[contenteditable="true"]', { timeout: 10000 });

    let madeChanges = false;

    // Update content if provided - TipTap editors work well with keyboard events
    if (newContent) {
      const contentEditor = this.noteContentEditor;
      await expect(contentEditor).toBeVisible({ timeout: 10000 });
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
        await expect(contentEditor).toBeVisible({ timeout: 10000 });
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

    // Wait for any lingering toasts from note creation to disappear first
    // This prevents the strict mode violation when multiple alerts are present
    const existingToasts = this.page.locator('[role="alert"]');
    const existingToastCount = await existingToasts.count();
    if (existingToastCount > 0) {
      // Wait for existing toasts to clear (they auto-dismiss)
      await expect(existingToasts.first()).not.toBeVisible({ timeout: 10000 });
    }

    // Hover to reveal the delete button (it's hidden by default with opacity-0)
    await noteCard.hover();
    await this.page.waitForTimeout(500); // Wait for opacity transition

    // Click the delete button within this card - use force since it may be partially obscured
    const deleteBtn = noteCard.locator('button[aria-label="Delete note"]');
    await deleteBtn.click({ force: true, timeout: 5000 });

    // Wait for the delete confirmation toast to appear
    // Use filter to specifically target the "Delete Note" confirmation toast
    // This avoids strict mode violations if other toasts are present
    const deleteConfirmToast = this.page.locator('[role="alert"]').filter({ hasText: 'Delete Note' });
    await expect(deleteConfirmToast).toBeVisible({ timeout: 5000 });

    // Find the "Delete" action button within the confirmation toast
    const confirmBtn = deleteConfirmToast.locator('button').filter({ hasText: /^Delete$/ }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });

    // Scroll the button into view and click it
    // The toast may be positioned outside the viewport initially
    await confirmBtn.scrollIntoViewIfNeeded();
    await confirmBtn.click();

    // Wait for the API to complete and UI to update
    await this.page.waitForTimeout(2000);

    // Reload the page to ensure we see the updated list (soft delete removes from default view)
    await this.page.reload();
    await this.waitForPageLoad();

    // Wait for the note to no longer be visible (soft-deleted notes shouldn't show by default)
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
    await expect(this.noteCards.filter({ hasText: title })).not.toBeVisible({ timeout: 15000 });
  }

  async expectNotesCount(count: number) {
    await expect(this.noteCards).toHaveCount(count);
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }
}
