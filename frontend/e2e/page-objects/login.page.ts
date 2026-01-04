import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Login page.
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get emailInput() {
    return this.page.locator('input[type="email"], input[name="email"], input[name="identifier"]').first();
  }

  get passwordInput() {
    return this.page.locator('input[type="password"]').first();
  }

  get loginButton() {
    return this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  }

  get registerLink() {
    return this.page.locator('a:has-text("Register"), a:has-text("Sign up"), a:has-text("Create account")');
  }

  get errorMessage() {
    return this.page.locator('[role="alert"], .error-message, [data-testid="error-message"]');
  }

  // Actions
  async goto() {
    await super.goto('/login');
  }

  async login(email: string, password: string) {
    await this.fillField(this.emailInput, email);
    await this.fillField(this.passwordInput, password);
    await this.loginButton.click();
  }

  async loginAndExpectSuccess(email: string, password: string) {
    await this.login(email, password);
    // Wait for redirect away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });
    await this.waitForPageLoad();
  }

  async loginAndExpectError(email: string, password: string) {
    await this.login(email, password);
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
  }

  // Assertions
  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async expectErrorMessage(text: string | RegExp) {
    await expect(this.errorMessage).toContainText(text);
  }
}
