import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Focus/Productivity page.
 */
export class FocusPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators - Current Focus
  get currentFocusCard() {
    return this.page.locator('[data-testid="current-focus"], .current-focus-card');
  }

  get focusTimer() {
    return this.page.locator('[data-testid="focus-timer"], .focus-timer');
  }

  get startFocusButton() {
    return this.page.locator('button:has-text("Start Focus"), button:has-text("Start Timer"), [data-testid="start-focus"]');
  }

  get stopFocusButton() {
    return this.page.locator('button:has-text("Stop"), button:has-text("Pause"), [data-testid="stop-focus"]');
  }

  get completeFocusButton() {
    return this.page.locator('button:has-text("Complete"), button:has-text("Done"), [data-testid="complete-focus"]');
  }

  // Locators - Task Management
  get createTaskButton() {
    return this.page.locator('button:has-text("New Task"), button:has-text("Add Task"), [data-testid="create-task"]');
  }

  get tasksList() {
    return this.page.locator('[data-testid="tasks-list"], .tasks-list');
  }

  get taskItems() {
    return this.page.locator('[data-testid="task-item"], .task-item');
  }

  get backlogSection() {
    return this.page.locator('[data-testid="backlog-section"], .backlog-section');
  }

  get todaysPlanSection() {
    return this.page.locator('[data-testid="todays-plan"], .todays-plan-section');
  }

  // Task modal/form
  get taskModal() {
    return this.page.locator('[data-testid="task-modal"], .task-modal, [role="dialog"]');
  }

  get taskTitleInput() {
    return this.page.locator('input[name="title"], input[placeholder*="Task" i], [data-testid="task-title"]');
  }

  get taskDescriptionInput() {
    return this.page.locator('textarea[name="description"], [data-testid="task-description"]');
  }

  get prioritySelect() {
    return this.page.locator('[data-testid="priority-select"], select[name="priority"]');
  }

  get scheduledDateInput() {
    return this.page.locator('input[type="date"], [data-testid="scheduled-date"]');
  }

  get saveTaskButton() {
    return this.page.locator('button:has-text("Save"), button[type="submit"], [data-testid="save-task"]');
  }

  get deleteTaskButton() {
    return this.page.locator('button:has-text("Delete"), [data-testid="delete-task"]');
  }

  // AI Suggestions
  get suggestionsPanel() {
    return this.page.locator('[data-testid="suggestions-panel"], .suggestions-panel');
  }

  get suggestionItems() {
    return this.page.locator('[data-testid="suggestion-item"], .suggestion-item');
  }

  get acceptSuggestionButton() {
    return this.page.locator('button:has-text("Accept"), [data-testid="accept-suggestion"]');
  }

  // Actions
  async goto() {
    await super.goto('/focus');
  }

  async createTask(title: string, options?: { description?: string; priority?: '1' | '2' | '3'; scheduledDate?: string }) {
    await this.createTaskButton.click();
    await expect(this.taskModal).toBeVisible();

    await this.fillField(this.taskTitleInput, title);

    if (options?.description) {
      await this.fillField(this.taskDescriptionInput, options.description);
    }

    if (options?.priority) {
      await this.prioritySelect.selectOption(options.priority);
    }

    if (options?.scheduledDate) {
      await this.scheduledDateInput.fill(options.scheduledDate);
    }

    await this.saveTaskButton.click();
    await expect(this.taskModal).not.toBeVisible({ timeout: 10000 });
  }

  async openTask(title: string) {
    const taskItem = this.taskItems.filter({ hasText: title }).first();
    await taskItem.click();
    await expect(this.taskModal).toBeVisible();
  }

  async setAsCurrentFocus(title: string) {
    const taskItem = this.taskItems.filter({ hasText: title }).first();
    const setFocusButton = taskItem.locator('button:has-text("Set as Focus"), [data-testid="set-focus"]');
    await setFocusButton.click();
    await expect(this.currentFocusCard).toContainText(title);
  }

  async startFocusTimer() {
    await this.startFocusButton.click();
    await expect(this.focusTimer).toBeVisible();
  }

  async stopFocusTimer() {
    await this.stopFocusButton.click();
  }

  async completeCurrentFocus() {
    await this.completeFocusButton.click();
    // Wait for task to be removed from current focus
    await this.page.waitForTimeout(500);
  }

  async deleteTask(title: string) {
    await this.openTask(title);
    await this.deleteTaskButton.click();

    // Confirm deletion if there's a confirmation dialog
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(this.taskModal).not.toBeVisible({ timeout: 10000 });
  }

  async acceptSuggestion(index: number = 0) {
    const suggestion = this.suggestionItems.nth(index);
    await suggestion.locator(this.acceptSuggestionButton).click();
  }

  // Assertions
  async expectToBeOnFocusPage() {
    await expect(this.page).toHaveURL(/\/focus/);
  }

  async expectTaskToExist(title: string) {
    await expect(this.taskItems.filter({ hasText: title })).toBeVisible();
  }

  async expectTaskNotToExist(title: string) {
    await expect(this.taskItems.filter({ hasText: title })).not.toBeVisible();
  }

  async expectCurrentFocus(title: string) {
    await expect(this.currentFocusCard).toContainText(title);
  }

  async expectNoCurrentFocus() {
    await expect(this.currentFocusCard).not.toBeVisible();
  }

  async expectTimerRunning() {
    await expect(this.focusTimer).toBeVisible();
    await expect(this.stopFocusButton).toBeVisible();
  }

  async expectTasksCount(count: number) {
    await expect(this.taskItems).toHaveCount(count);
  }

  async expectSuggestionsToBeVisible() {
    await expect(this.suggestionsPanel).toBeVisible();
    await expect(this.suggestionItems.first()).toBeVisible();
  }
}
