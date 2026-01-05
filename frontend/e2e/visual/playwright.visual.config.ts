import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration specifically for visual regression tests.
 * Uses stricter settings for screenshot comparison.
 */
export default defineConfig({
  testDir: path.resolve(__dirname),

  // Run visual tests sequentially for consistency
  fullyParallel: false,
  workers: 1,

  // No retries for visual tests - we want consistent results
  retries: 0,

  // Fail on any leftover test.only
  forbidOnly: !!process.env.CI,

  reporter: [
    ['html', { outputFolder: '../playwright-report-visual' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Consistent viewport for screenshots
    viewport: { width: 1280, height: 720 },

    // Disable animations and transitions
    reducedMotion: 'reduce',

    // Take screenshots for comparison
    screenshot: 'on',

    // Don't record video for visual tests
    video: 'off',

    // Trace only on failure
    trace: 'on-first-retry',
  },

  expect: {
    // Visual comparison settings
    toHaveScreenshot: {
      // Allow 1% pixel difference
      maxDiffPixelRatio: 0.01,

      // Threshold for individual pixel comparison
      threshold: 0.2,

      // Animation tolerance
      animations: 'disabled',
    },

    // Snapshot path configuration
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  // Store snapshots next to test files
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: path.resolve(__dirname, '../.auth/user.json'),
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: path.resolve(__dirname, '../.auth/user.json'),
      },
    },
  ],
});
