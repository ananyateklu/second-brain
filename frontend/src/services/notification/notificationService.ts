import { Reminder } from '../../api/types/reminder';

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
    console.log('NotificationService initialized:', {
      isEnabled: this.isEnabled,
      storedPermission: localStorage.getItem('notifications_enabled')
    });
    
    // Check current permission status
    if (!('Notification' in window)) {
      console.error('Notifications are not supported in this browser');
      return;
    }

    // Check if we're in a secure context (required for notifications)
    if (!window.isSecureContext) {
      console.error('Notifications require a secure context (HTTPS)');
      return;
    }

    this.permission = Notification.permission;
    console.log('Current notification permission:', this.permission);

    // Request permission immediately if it's not set
    if (this.permission === 'default') {
      this.requestPermission().then(granted => {
        console.log('Initial permission request result:', granted);
      });
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
    console.log('Cleared notification history');
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      this.permission = permission;
      console.log('Permission response:', permission);

      // Log the current state of notifications
      console.log('Notification state:', {
        permission: this.permission,
        isEnabled: this.isEnabled,
        browserSupport: 'Notification' in window,
        secureContext: window.isSecureContext
      });

      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public async enableNotifications(): Promise<boolean> {
    console.log('Attempting to enable notifications...');
    
    if (!('Notification' in window)) {
      console.error('Notifications are not supported in this browser');
      return false;
    }

    if (!window.isSecureContext) {
      console.error('Notifications require a secure context (HTTPS)');
      return false;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('Failed to get notification permission');
        return false;
      }
    }

    this.isEnabled = true;
    localStorage.setItem('notifications_enabled', 'true');
    this.clearNotificationHistory();
    console.log('Notifications enabled successfully');

    // Send an immediate test notification
    try {
      await this.showNotification('Notifications Enabled', {
        body: 'You will now receive notifications from Second Brain.',
        tag: 'notifications-test',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Error showing test notification:', error);
    }

    return true;
  }

  public disableNotifications(): void {
    console.log('Disabling notifications');
    this.isEnabled = false;
    localStorage.setItem('notifications_enabled', 'false');
    this.clearNotificationHistory();
  }

  public isNotificationsEnabled(): boolean {
    const enabled = this.isEnabled && this.permission === 'granted';
    console.log('Checking if notifications are enabled:', {
      isEnabled: this.isEnabled,
      permission: this.permission,
      result: enabled,
      browserSupport: 'Notification' in window,
      secureContext: window.isSecureContext
    });
    return enabled;
  }

  public async showNotification(title: string, options?: CustomNotificationOptions): Promise<void> {
    if (!this.isNotificationsEnabled()) {
      console.log('Notification not shown - notifications are disabled');
      return;
    }

    try {
      console.log('Attempting to show notification:', { title, options });

      const notification = new Notification(title, {
        ...options,
        icon: this.iconPath,
        badge: this.iconPath,
        tag: options?.tag || `notification-${Date.now()}`,
        requireInteraction: options?.requireInteraction ?? false,
        silent: false
      });

      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        if (options?.data?.reminderId) {
          window.location.href = '/dashboard/reminders';
        }
        notification.close();
      };

      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error showing notification:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }
  }

  public async showReminderNotification(reminder: Reminder, force: boolean = false): Promise<void> {
    console.log('Attempting to show reminder notification:', reminder);
    
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