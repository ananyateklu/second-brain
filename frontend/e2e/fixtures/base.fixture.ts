import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { DashboardPage } from '../page-objects/dashboard.page';
import { NotesPage } from '../page-objects/notes.page';
import { ChatPage } from '../page-objects/chat.page';
import { FocusPage } from '../page-objects/focus.page';
import { ApiHelpers } from '../utils/api-helpers';

/**
 * Extended test fixtures for Second Brain E2E tests.
 * Provides access to page objects and API helpers.
 */
export interface TestFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  notesPage: NotesPage;
  chatPage: ChatPage;
  focusPage: FocusPage;
  api: ApiHelpers;
}

/**
 * Extended test with custom fixtures.
 */
export const test = base.extend<TestFixtures>({
  // Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  notesPage: async ({ page }, use) => {
    await use(new NotesPage(page));
  },

  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },

  focusPage: async ({ page }, use) => {
    await use(new FocusPage(page));
  },

  // API Helpers for test setup/teardown
  api: async ({ request }, use) => {
    await use(new ApiHelpers(request));
  },
});

export { expect };
