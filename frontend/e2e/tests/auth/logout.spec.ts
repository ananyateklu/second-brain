import { test, expect } from '../../fixtures/base.fixture';

test.describe('Logout Flow', () => {
  test('should logout successfully and redirect to login', async ({ dashboardPage }) => {
    // Start on dashboard (authenticated via global setup)
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    // Logout
    await dashboardPage.logout();

    // Should be redirected to login
    await expect(dashboardPage.page).toHaveURL(/\/login/);
  });

  test('should clear session after logout', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    // Logout
    await dashboardPage.logout();

    // Try to access a protected route
    await page.goto('/notes');

    // Should be redirected to login (session cleared)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should not be able to use back button to access protected pages after logout', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    // Navigate to notes
    await dashboardPage.navigateToNotes();
    await expect(page).toHaveURL(/\/notes/);

    // Go back to dashboard
    await dashboardPage.goto();

    // Logout
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login/);

    // Try to go back
    await page.goBack();

    // Should be redirected to login, not the notes page
    await page.waitForTimeout(1000);
    const currentUrl = page.url();

    // Either stays on login or redirects back to login
    if (!currentUrl.includes('/login')) {
      // If we somehow got to a protected page, wait for redirect
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });
});
