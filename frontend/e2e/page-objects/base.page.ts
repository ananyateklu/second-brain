import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page object with common methods for all pages.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path relative to the base URL.
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to fully load.
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get an element by its data-testid attribute.
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get an element by text content.
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Get an element by role.
   */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get an element by placeholder text.
   */
  getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  /**
   * Get an element by label.
   */
  getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  /**
   * Wait for a toast notification to appear.
   */
  async waitForToast(text: string | RegExp) {
    const toast = this.page.locator('[role="status"], [data-testid="toast"], .toast').filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 10000 });
    return toast;
  }

  /**
   * Take a screenshot with a descriptive name.
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png` });
  }

  /**
   * Wait for navigation to a specific URL pattern.
   */
  async waitForNavigation(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Check if an element exists on the page.
   */
  async exists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Fill a form field and verify the value.
   */
  async fillField(locator: Locator, value: string) {
    await locator.clear();
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }

  /**
   * Click and wait for navigation.
   */
  async clickAndNavigate(locator: Locator) {
    await Promise.all([
      this.page.waitForNavigation(),
      locator.click(),
    ]);
  }

  /**
   * Click an element, scrolling into view if needed.
   * Uses JavaScript click if normal click fails.
   */
  async scrollAndClick(locator: Locator) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ timeout: 5000 });
    } catch {
      // Fallback to JavaScript click if element is in a complex layout
      await locator.evaluate((el) => (el as HTMLElement).click());
    }
  }

  /**
   * Dismiss any modal dialogs.
   */
  async dismissModals() {
    const closeButtons = this.page.locator('[aria-label="Close"], [data-testid="modal-close"], button:has-text("Close")');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click().catch(() => {});
    }
  }

  /**
   * Get the current URL path.
   */
  get currentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Ensure the sidebar is open/visible for interaction.
   * If the sidebar is closed, clicks the open button to expand it.
   */
  async ensureSidebarOpen() {
    // Check if sidebar is visible using data-testid or sticky class
    const sidebar = this.page.locator('[data-testid="main-sidebar"]:visible, aside.sticky:visible').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (!sidebarVisible) {
      // Sidebar is closed, click the open button if available
      const openButton = this.page.locator('button[aria-label="Open sidebar"]');
      if (await openButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await openButton.click();
        // Wait for sidebar to become visible
        await this.page.waitForTimeout(500);
      }
    }
  }
}
