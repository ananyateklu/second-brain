import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Dashboard page.
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get welcomeMessage() {
    return this.page.locator('h1, [data-testid="welcome-message"]').first();
  }

  get statsCards() {
    return this.page.locator('[data-testid="stat-card"], .stat-card');
  }

  get recentNotes() {
    return this.page.locator('[data-testid="recent-notes"], .recent-notes');
  }

  get recentConversations() {
    return this.page.locator('[data-testid="recent-conversations"], .recent-conversations');
  }

  get navigationSidebar() {
    // Match the desktop sidebar (sticky positioning, not fixed/temporary)
    return this.page.locator('aside.sticky');
  }

  get notesNavLink() {
    // In collapsed mode, text labels are hidden - use href only
    // Target the sticky sidebar (not the hidden temporary one)
    return this.page.locator('aside.sticky a[href="/notes"]');
  }

  get chatNavLink() {
    return this.page.locator('aside.sticky a[href="/chat"]');
  }

  get focusNavLink() {
    // Focus page may not exist in sidebar
    return this.page.locator('aside.sticky a[href="/focus"]');
  }

  get settingsNavLink() {
    return this.page.locator('aside.sticky a[href="/settings"]');
  }

  get userMenu() {
    return this.page.locator('button[aria-label="User menu"]');
  }

  get logoutButton() {
    return this.page.locator('div[role="menuitem"]:has-text("Sign Out"), button:has-text("Sign Out")');
  }

  // Actions
  async goto() {
    await super.goto('/');
  }

  async navigateToNotes() {
    await this.notesNavLink.click();
    await this.page.waitForURL(/\/notes/);
  }

  async navigateToChat() {
    await this.chatNavLink.click();
    await this.page.waitForURL(/\/chat/);
  }

  async navigateToFocus() {
    await this.focusNavLink.click();
    await this.page.waitForURL(/\/focus/);
  }

  async navigateToSettings() {
    await this.settingsNavLink.click();
    await this.page.waitForURL(/\/settings/);
  }

  async logout() {
    // Click user menu to open dropdown
    await expect(this.userMenu).toBeVisible({ timeout: 5000 });
    await this.userMenu.click();

    // Wait for dropdown to appear
    await expect(this.logoutButton).toBeVisible({ timeout: 5000 });
    await this.logoutButton.click();

    await this.page.waitForURL(/\/login/, { timeout: 10000 });
  }

  // Assertions
  async expectToBeOnDashboard() {
    // Match root path or /dashboard (full URL ends with / or /dashboard)
    await expect(this.page).toHaveURL(/\/($|dashboard)/);
    await this.waitForPageLoad();
  }

  async expectStatsToBeVisible() {
    await expect(this.statsCards.first()).toBeVisible({ timeout: 10000 });
  }

  async expectNavigationToBeVisible() {
    await expect(this.navigationSidebar).toBeVisible();
  }
}
