import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright configuration for Second Brain E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directory containing test files
  testDir: './e2e/tests',

  // Global setup and teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability, use 4 workers locally
  workers: process.env.CI ? 1 : 4,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || 'https://localhost:3000',

    // Ignore HTTPS errors (for self-signed certs in dev)
    ignoreHTTPSErrors: true,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',

    // Default timeout for actions
    actionTimeout: 10000,

    // Default navigation timeout
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for major browsers
  projects: [
    // Main test projects
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'e2e/.auth/user.json',
        // Larger viewport for complex layouts
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: 'e2e/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: 'e2e/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    // },

    // Mobile viewport testing
    // {
    //   name: 'mobile-chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //     storageState: 'e2e/.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if you want Playwright to start the server automatically
  // webServer: [
  //   {
  //     command: 'cd ../backend/src/SecondBrain.API && dotnet run',
  //     url: 'http://localhost:5001/api/health',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120000,
  //   },
  //   {
  //     command: 'pnpm dev',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 30000,
  //   },
  // ],
});
