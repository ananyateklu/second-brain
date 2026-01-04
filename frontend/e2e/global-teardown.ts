import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global teardown for E2E tests.
 * Cleans up any test data or resources created during tests.
 */
async function globalTeardown(config: FullConfig) {
  const authFile = path.join(__dirname, '.auth/user.json');

  // Clean up auth state file in CI (keep for local development)
  if (process.env.CI && fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('Cleaned up auth state file');
  }

  // Add any additional cleanup here:
  // - Delete test data via API
  // - Clean up temporary files
  // - Reset database state

  console.log('Global teardown completed');
}

export default globalTeardown;
