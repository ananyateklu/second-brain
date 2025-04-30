import { Reminder } from '../../types/reminder';

interface CustomNotificationOptions extends NotificationOptions {
  force?: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isEnabled: boolean = false;
  private readonly iconPath: string = '/brain-top.png';

  private constructor() {
    // Check if notifications were previously enabled
    this.isEnabled = localStorage.getItem('notifications_enabled') === 'true';

    // Check current permission status
    if (!('Notification' in window)) {
      return;
    }

    // Check if we're in a secure context (required for notifications)
    if (!window.isSecureContext) {
      return;
    }

    this.permission = Notification.permission;

    // Request permission immediately if it's not set
    if (this.permission === 'default') {
      this.requestPermission();
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public clearNotificationHistory(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('last_notification_')) {
        localStorage.removeItem(key);
      }
    });
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      return permission === 'granted';
    } catch {
      return false;
    }
  }

  public async enableNotifications(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (!window.isSecureContext) {
      return false;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    this.isEnabled = true;
    localStorage.setItem('notifications_enabled', 'true');
    this.clearNotificationHistory();

    // Send an immediate test notification
    try {
      await this.showNotification('Notifications Enabled', {
        body: 'You will now receive notifications from Second Brain.',
        tag: 'notifications-test',
        requireInteraction: false
      });
    } catch {
      // Ignore error
    }

    return true;
  }

  public disableNotifications(): void {
    this.isEnabled = false;
    localStorage.setItem('notifications_enabled', 'false');
    this.clearNotificationHistory();
  }

  public isNotificationsEnabled(): boolean {
    return this.isEnabled && this.permission === 'granted';
  }

  public async showNotification(title: string, options?: CustomNotificationOptions): Promise<void> {
    if (!this.isNotificationsEnabled()) {
      return;
    }

    try {
      const notification = new Notification(title, {
        ...options,
        icon: this.iconPath,
        badge: this.iconPath,
        tag: options?.tag || `notification-${Date.now()}`,
        requireInteraction: options?.requireInteraction ?? false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        if (options?.data?.reminderId) {
          window.location.href = '/dashboard/reminders';
        }
        notification.close();
      };
    } catch {
      // Ignore error
    }
  }

  public async showReminderNotification(reminder: Reminder, force: boolean = false): Promise<void> {
    const now = new Date();
    const dueDate = new Date(reminder.dueDateTime);
    const timeDiff = dueDate.getTime() - now.getTime();
    const isOverdue = timeDiff < 0;

    const title = isOverdue
      ? '⚠️ Overdue Reminder: ' + reminder.title
      : '⏰ Upcoming Reminder: ' + reminder.title;

    const options: CustomNotificationOptions = {
      body: reminder.description || 'You have a reminder',
      tag: `reminder-${reminder.id}`,
      data: { reminderId: reminder.id },
      requireInteraction: true,
      force
    };

    await this.showNotification(title, options);
  }

  public async showXPNotification(xp: number, achievement?: { name: string; icon: string }, levelUp?: { newLevel: number }): Promise<void> {
    const title = `+${xp} XP`;
    let body = '';

    if (achievement) {
      body += `Achievement Unlocked: ${achievement.name}\n`;
    }
    if (levelUp) {
      body += `Level Up! You're now level ${levelUp.newLevel}`;
    }

    const options: CustomNotificationOptions = {
      body,
      tag: 'xp-notification',
      requireInteraction: false,
      force: true
    };

    await this.showNotification(title, options);
  }
}

export const notificationService = NotificationService.getInstance(); 