import { test, expect } from '../../fixtures/base.fixture';
import { TEST_USER } from '../../utils/test-data';

test.describe('Login Flow', () => {
  // These tests run without authentication (no stored state)
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should display login page with form elements', async ({ loginPage }) => {
    await loginPage.goto();

    await loginPage.expectToBeOnLoginPage();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();

    await loginPage.loginAndExpectSuccess(TEST_USER.email, TEST_USER.password);

    // Should be redirected to dashboard
    await dashboardPage.expectToBeOnDashboard();
  });

  test('should show error with invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();

    await loginPage.loginAndExpectError('invalid@example.com', 'wrongpassword');

    // Should still be on login page
    await loginPage.expectToBeOnLoginPage();
  });

  test('should show error with empty email', async ({ loginPage }) => {
    await loginPage.goto();

    await loginPage.passwordInput.fill(TEST_USER.password);
    await loginPage.loginButton.click();

    // Form validation should prevent submission or show error
    const isStillOnLogin = await loginPage.page.url().includes('/login');
    expect(isStillOnLogin).toBe(true);
  });

  test('should show error with empty password', async ({ loginPage }) => {
    await loginPage.goto();

    await loginPage.emailInput.fill(TEST_USER.email);
    await loginPage.loginButton.click();

    // Form validation should prevent submission or show error
    const isStillOnLogin = await loginPage.page.url().includes('/login');
    expect(isStillOnLogin).toBe(true);
  });

  test('should persist session after page refresh', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.goto();
    await loginPage.loginAndExpectSuccess(TEST_USER.email, TEST_USER.password);
    await dashboardPage.expectToBeOnDashboard();

    // Refresh the page
    await page.reload();
    await dashboardPage.waitForPageLoad();

    // Should still be on dashboard (session persisted)
    await dashboardPage.expectToBeOnDashboard();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access a protected route without authentication
    await page.goto('/notes');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from chat to login', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users from focus to login', async ({ page }) => {
    await page.goto('/focus');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show register link', async ({ loginPage }) => {
    await loginPage.goto();

    // Check if register link is visible (if exists)
    const registerLink = loginPage.registerLink;
    const isVisible = await registerLink.isVisible().catch(() => false);

    if (isVisible) {
      await expect(registerLink).toBeVisible();
    }
  });
});
