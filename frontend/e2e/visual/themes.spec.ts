import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for light/dark theme variants.
 */
test.describe('Visual Regression - Themes', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test('dashboard - light theme', async ({ page }) => {
    // Set light theme
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click theme toggle if needed to ensure light mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Check current theme and toggle if in dark mode
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (isDark) {
        await themeToggle.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('dashboard - dark theme', async ({ page }) => {
    // Set dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click theme toggle if needed to ensure dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Check current theme and toggle if in light mode
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (!isDark) {
        await themeToggle.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('notes list - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('notes-list-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('notes list - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('notes-list-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chat - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('chat-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chat - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('chat-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
