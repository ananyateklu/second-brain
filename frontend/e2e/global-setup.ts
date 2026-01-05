import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Global setup for E2E tests.
 * Authenticates a test user and saves the session state for reuse.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Launch browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // Handle self-signed certs in dev
  });
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for login form to be visible
    await page.waitForSelector('#identifier', {
      timeout: 10000,
    });

    // Fill in login credentials
    // Using test user credentials - these should match your test database
    const testEmail = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'E2ETestPassword123!';

    // Try to login first
    await page.fill('#identifier', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait a bit and check if we got an error or navigated away
    await page.waitForTimeout(2000);

    // Check if login failed (still on login page with error)
    const currentUrl = page.url();
    const hasError = await page.locator('text=Invalid credentials').isVisible().catch(() => false);

    if (currentUrl.includes('/login') && hasError) {
      console.log('Login failed, attempting to register test user...');

      // Click "Create one" to switch to register mode
      await page.click('text=Create one');
      await page.waitForTimeout(500);

      // Fill registration form
      await page.fill('#identifier', testEmail);
      await page.fill('#password', testPassword);

      // Fill confirm password if visible
      const confirmPasswordField = page.locator('input[placeholder="Confirm your password"]');
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testPassword);
      }

      // Click create account button
      await page.click('button[type="submit"]');
    }

    // Wait for successful navigation to dashboard or main page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 30000,
    });

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Set UI preferences for consistent test behavior
    await page.evaluate(() => {
      // Ensure sidebar is visible (collapsed shows icons, not fully closed)
      localStorage.setItem('second-brain-sidebar-state', 'collapsed');
      // Ensure chat sidebar is visible
      localStorage.setItem('second-brain-chat-sidebar-visible', 'true');
      // Ensure directory sidebar is visible
      localStorage.setItem('second-brain-directory-sidebar-visible', 'true');
    });

    // Save authentication state
    await context.storageState({ path: authFile });

    console.log('Authentication successful, state saved to', authFile);
  } catch (error) {
    console.error('Authentication failed:', error);

    // Take a screenshot for debugging
    const screenshotPath = path.join(__dirname, '.auth/setup-failure.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Failure screenshot saved to', screenshotPath);

    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
