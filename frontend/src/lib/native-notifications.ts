import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

/**
 * Check if we're running in Tauri
 */
export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) {
    // Fall back to web notifications
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }
  
  let permissionGranted = await isPermissionGranted();
  
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }
  
  return permissionGranted;
}

/**
 * Send a native notification
 */
export async function notify(title: string, body: string): Promise<void> {
  if (!isTauri()) {
    // Fall back to web notifications with error handling
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch (error) {
      // Silently fail for web notifications - they're not critical
      console.warn('Failed to show web notification:', error);
    }
    return;
  }

  try {
    const permissionGranted = await isPermissionGranted();

    if (permissionGranted) {
      sendNotification({ title, body });
    }
  } catch (error) {
    // Log error but don't throw - notifications are not critical to app function
    console.warn('Failed to send native notification:', error);
  }
}

/**
 * Notification for AI response complete
 */
export async function notifyAIResponseComplete(conversationTitle: string): Promise<void> {
  await notify('AI Response Ready', `Response received in "${conversationTitle}"`);
}

/**
 * Notification for indexing complete
 */
export async function notifyIndexingComplete(noteCount: number): Promise<void> {
  await notify('Indexing Complete', `Successfully indexed ${noteCount} notes`);
}

/**
 * Notification for error
 */
export async function notifyError(message: string): Promise<void> {
  await notify('Error', message);
}

