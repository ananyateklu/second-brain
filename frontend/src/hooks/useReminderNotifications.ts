import { useEffect } from 'react';
import { useReminders } from '../contexts/remindersContextUtils';
import { notificationService } from '../services/notification/notification.service';

export function useReminderNotifications() {
  const { reminders } = useReminders();

  useEffect(() => {
    // Check for due reminders every minute
    const checkReminders = () => {
      const now = new Date();

      reminders.forEach(reminder => {
        // Skip if reminder is completed
        if (reminder.isCompleted) {
          return;
        }

        // Skip if reminder is snoozed and snooze time hasn't elapsed
        if (reminder.isSnoozed && reminder.snoozeUntil) {
          const snoozeUntil = new Date(reminder.snoozeUntil);
          if (now < snoozeUntil) {
            return;
          }
        }

        const dueDate = new Date(reminder.dueDateTime);
        const timeDiff = dueDate.getTime() - now.getTime();
        const minutesUntilDue = Math.floor(timeDiff / 60000);
        const hoursUntilDue = Math.floor(minutesUntilDue / 60);


        // Get the last notification time for this reminder from localStorage
        const lastNotificationKey = `last_notification_${reminder.id}`;
        const lastNotification = localStorage.getItem(lastNotificationKey);
        const lastNotificationTime = lastNotification ? parseInt(lastNotification) : 0;
        const timeSinceLastNotification = now.getTime() - lastNotificationTime;

        // Format a detailed description based on the time status
        let description = reminder.description ? `${reminder.description}\n\n` : '';

        // Show notification for overdue reminders
        if (timeDiff < 0) {
          // For overdue reminders, show notification if it's been more than 30 minutes
          if (timeSinceLastNotification >= 1800000) { // 30 minutes
            const overdueDuration = Math.abs(timeDiff);
            const overdueDays = Math.floor(overdueDuration / (1000 * 60 * 60 * 24));
            const overdueHours = Math.floor((overdueDuration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const overdueMinutes = Math.floor((overdueDuration % (1000 * 60 * 60)) / (1000 * 60));

            let overdueText = 'Overdue by ';
            if (overdueDays > 0) overdueText += `${overdueDays} days `;
            if (overdueHours > 0) overdueText += `${overdueHours} hours `;
            if (overdueMinutes > 0) overdueText += `${overdueMinutes} minutes`;

            description += overdueText;

            notificationService.showReminderNotification({
              ...reminder,
              description
            }, true);
            localStorage.setItem(lastNotificationKey, now.getTime().toString());
          }
          return;
        }

        // Show notification for upcoming reminders (due in next 5 minutes)
        if (timeDiff <= 300000 && timeDiff > 0) { // 5 minutes in milliseconds
          // For upcoming reminders, show notification if it's been more than 5 minutes
          if (timeSinceLastNotification >= 300000) { // 5 minutes
            if (minutesUntilDue < 60) {
              description += `Due in ${minutesUntilDue} minutes`;
            } else {
              description += `Due in ${hoursUntilDue} hours and ${minutesUntilDue % 60} minutes`;
            }

            notificationService.showReminderNotification({
              ...reminder,
              description
            }, true);
            localStorage.setItem(lastNotificationKey, now.getTime().toString());
          }
          return;
        }
      });
    };


    // Check immediately on mount
    checkReminders();

    // Set up interval to check every minute
    const interval = setInterval(checkReminders, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [reminders]);
} 