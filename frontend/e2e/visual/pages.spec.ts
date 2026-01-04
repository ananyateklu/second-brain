import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for main pages.
 * These tests capture screenshots for visual comparison.
 */
test.describe('Visual Regression - Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
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

  test('dashboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mask dynamic content
    await maskTimestamps(page);

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('notes list page', async ({ page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    await maskTimestamps(page);

    await expect(page).toHaveScreenshot('notes-list.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chat page', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    await maskTimestamps(page);

    await expect(page).toHaveScreenshot('chat.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('focus page', async ({ page }) => {
    await page.goto('/focus');
    await page.waitForLoadState('networkidle');

    await maskTimestamps(page);

    await expect(page).toHaveScreenshot('focus.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('insights page', async ({ page }) => {
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    await maskTimestamps(page);

    await expect(page).toHaveScreenshot('insights.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

/**
 * Helper to mask dynamic timestamp elements.
 */
async function maskTimestamps(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    // Mask elements with timestamp-like patterns
    const timestampSelectors = [
      '[data-testid*="timestamp"]',
      '[data-testid*="date"]',
      '.timestamp',
      '.date',
      'time',
    ];

    timestampSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.visibility = 'hidden';
      });
    });
  });
}
