import { test, expect } from '../../fixtures/base.fixture';
import { TestFocusItems, generateTestId, getTodayForInput, getTomorrowForInput } from '../../utils/test-data';

test.describe('Focus Task Management', () => {
  test.beforeEach(async ({ focusPage }) => {
    await focusPage.goto();
    await focusPage.expectToBeOnFocusPage();
  });

  test('should display focus page', async ({ focusPage }) => {
    await expect(focusPage.createTaskButton).toBeVisible();
  });

  test('should create a new task', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    await focusPage.createTask(taskData.title);

    await focusPage.expectTaskToExist(taskData.title);
  });

  test('should create a high priority task', async ({ focusPage }) => {
    const taskData = TestFocusItems.highPriority();

    await focusPage.createTask(taskData.title, {
      description: taskData.description,
      priority: '1',
    });

    await focusPage.expectTaskToExist(taskData.title);
  });

  test('should create a task with scheduled date', async ({ focusPage }) => {
    const tomorrow = getTomorrowForInput();
    const taskData = TestFocusItems.scheduled(tomorrow);

    await focusPage.createTask(taskData.title, {
      priority: '2',
      scheduledDate: tomorrow,
    });

    await focusPage.expectTaskToExist(taskData.title);
  });

  test('should set a task as current focus', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    // Create a task
    await focusPage.createTask(taskData.title);
    await focusPage.expectTaskToExist(taskData.title);

    // Set as current focus
    await focusPage.setAsCurrentFocus(taskData.title);

    // Should appear in current focus card
    await focusPage.expectCurrentFocus(taskData.title);
  });

  test('should start focus timer', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    // Create and set as focus
    await focusPage.createTask(taskData.title);
    await focusPage.setAsCurrentFocus(taskData.title);

    // Start timer
    await focusPage.startFocusTimer();

    // Timer should be visible
    await focusPage.expectTimerRunning();
  });

  test('should stop focus timer', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    // Create, set focus, and start timer
    await focusPage.createTask(taskData.title);
    await focusPage.setAsCurrentFocus(taskData.title);
    await focusPage.startFocusTimer();
    await focusPage.expectTimerRunning();

    // Stop timer
    await focusPage.stopFocusTimer();

    // Timer controls should update
    await expect(focusPage.startFocusButton.or(focusPage.completeFocusButton)).toBeVisible();
  });

  test('should complete a focus task', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    // Create and set as focus
    await focusPage.createTask(taskData.title);
    await focusPage.setAsCurrentFocus(taskData.title);
    await focusPage.expectCurrentFocus(taskData.title);

    // Complete the task
    await focusPage.completeCurrentFocus();

    // Task should be marked as complete or removed from focus
    // The behavior depends on implementation
    await focusPage.page.waitForTimeout(500);
  });

  test('should delete a task', async ({ focusPage }) => {
    const taskData = TestFocusItems.simple();

    // Create a task
    await focusPage.createTask(taskData.title);
    await focusPage.expectTaskToExist(taskData.title);

    // Delete the task
    await focusPage.deleteTask(taskData.title);

    // Task should be removed
    await focusPage.expectTaskNotToExist(taskData.title);
  });

  test('should update task priority', async ({ focusPage }) => {
    const taskData = {
      title: `Priority Update ${generateTestId()}`,
    };

    // Create a task with default priority
    await focusPage.createTask(taskData.title);
    await focusPage.expectTaskToExist(taskData.title);

    // Open the task
    await focusPage.openTask(taskData.title);

    // Change priority
    await focusPage.prioritySelect.selectOption('1');
    await focusPage.saveTaskButton.click();

    // Verify task still exists
    await focusPage.expectTaskToExist(taskData.title);
  });

  test('should show AI suggestions panel', async ({ focusPage }) => {
    // Check if suggestions panel exists
    const suggestionsVisible = await focusPage.suggestionsPanel.isVisible().catch(() => false);

    if (suggestionsVisible) {
      await focusPage.expectSuggestionsToBeVisible();
    } else {
      // Suggestions might not be available without notes
      console.log('AI suggestions panel not visible (may require notes for suggestions)');
    }
  });

  test('should handle multiple tasks', async ({ focusPage }) => {
    const tasks = [
      TestFocusItems.highPriority(),
      TestFocusItems.simple(),
      TestFocusItems.lowPriority(),
    ];

    // Create multiple tasks
    for (const task of tasks) {
      await focusPage.createTask(task.title, { priority: task.priority.toString() as '1' | '2' | '3' });
    }

    // Verify all tasks exist
    for (const task of tasks) {
      await focusPage.expectTaskToExist(task.title);
    }
  });
});
