import { Page, expect } from '@playwright/test';

/**
 * Wait helpers for E2E tests.
 */

/**
 * Wait for all network requests to complete.
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific API response.
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 30000) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Wait for SSE stream to complete.
 */
export async function waitForStreamComplete(page: Page, timeout = 60000) {
  // Wait for streaming indicator to disappear
  const streamingIndicator = page.locator('[data-testid="streaming"], .streaming-indicator');
  await expect(streamingIndicator).not.toBeVisible({ timeout });
}

/**
 * Wait for a toast notification to appear and optionally disappear.
 */
export async function waitForToast(page: Page, text: string | RegExp, options?: { waitForDismiss?: boolean }) {
  const toast = page.locator('[role="status"], [data-testid="toast"], .toast').filter({ hasText: text });
  await expect(toast).toBeVisible({ timeout: 10000 });

  if (options?.waitForDismiss) {
    await expect(toast).not.toBeVisible({ timeout: 10000 });
  }

  return toast;
}

/**
 * Wait for a modal to appear.
 */
export async function waitForModal(page: Page, timeout = 5000) {
  const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
  await expect(modal).toBeVisible({ timeout });
  return modal;
}

/**
 * Wait for a modal to close.
 */
export async function waitForModalClose(page: Page, timeout = 5000) {
  const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]');
  await expect(modal).not.toBeVisible({ timeout });
}

/**
 * Wait for loading state to complete.
 */
export async function waitForLoadingComplete(page: Page, timeout = 30000) {
  const loadingIndicators = page.locator(
    '[data-testid="loading"], .loading, .spinner, [aria-busy="true"], .skeleton'
  );

  // Wait for all loading indicators to disappear
  const count = await loadingIndicators.count();
  for (let i = 0; i < count; i++) {
    await expect(loadingIndicators.nth(i)).not.toBeVisible({ timeout }).catch(() => {});
  }
}

/**
 * Wait for a specific element to stop changing.
 */
export async function waitForStableContent(
  page: Page,
  selector: string,
  options?: { timeout?: number; pollInterval?: number }
) {
  const { timeout = 10000, pollInterval = 100 } = options || {};
  const element = page.locator(selector);

  let previousText = '';
  let stableCount = 0;
  const requiredStableCount = 3;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentText = await element.textContent() || '';

    if (currentText === previousText) {
      stableCount++;
      if (stableCount >= requiredStableCount) {
        return;
      }
    } else {
      stableCount = 0;
      previousText = currentText;
    }

    await page.waitForTimeout(pollInterval);
  }

  throw new Error(`Content did not stabilize within ${timeout}ms`);
}

/**
 * Retry an action until it succeeds or times out.
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  options?: { maxRetries?: number; delay?: number }
): Promise<T> {
  const { maxRetries = 3, delay = 1000 } = options || {};
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for the page to be interactive (DOM content loaded and main thread idle).
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => {
    return document.readyState === 'complete';
  });
}
