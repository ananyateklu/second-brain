import { useState, useCallback, useEffect, useMemo } from 'react';
import { reminderService } from '../api/services/reminderService';
import { useActivities } from './activityContextUtils';
import { useTrash } from './trashContextUtils';
import { Reminder, RemindersContext } from './remindersContextUtils';

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createActivity } = useActivities();
  const { moveToTrash } = useTrash();

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const remindersData = await reminderService.getReminders();
      const remindersWithTags = remindersData.map(reminder => ({
        ...reminder,
        tags: reminder.tags || [],
      }));
      setReminders(remindersWithTags);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const newReminder = await reminderService.createReminder(reminderData);
      setReminders(prev => [newReminder, ...prev]);

      await createActivity({
        actionType: 'create',
        itemType: 'reminder',
        itemId: newReminder.id,
        itemTitle: newReminder.title,
        description: `Created reminder: ${newReminder.title}`,
        metadata: { tags: newReminder.tags },
      });
    } catch (error) {
      console.error('Failed to add reminder:', error);
      throw error;
    }
  }, [createActivity]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {

      // Check if we have linked items in the update
      const linkedItemsFromUpdate = updates.linkedItems || [];
      const hasLinkedItems = linkedItemsFromUpdate.length > 0;

      // Clone the updates to avoid mutations
      const updatesToSend = { ...updates };

      // Make a backup of any linked items to ensure they're not lost if the API response doesn't include them
      const linkedItemsBackup = [...linkedItemsFromUpdate];

      const updatedReminder = await reminderService.updateReminder(id, updatesToSend);

      // Enhanced logic to preserve linked items
      if (hasLinkedItems) {
        if (!updatedReminder.linkedItems || updatedReminder.linkedItems.length === 0) {
          updatedReminder.linkedItems = linkedItemsBackup;
        } else {

          // Check if all types of items are included
          const types = new Set(updatedReminder.linkedItems.map(item => item.type));
          if (linkedItemsBackup.some(item => !types.has(item.type))) {

            // Create a merged version that preserves type diversity
            const existingIds = new Set(updatedReminder.linkedItems.map(item => item.id));
            const missingItems = linkedItemsBackup.filter(item => !existingIds.has(item.id));

            updatedReminder.linkedItems = [
              ...updatedReminder.linkedItems,
              ...missingItems
            ];
          }
        }
      }

      // Update the reminders state with complete data
      setReminders(prev =>
        prev.map(reminder => (reminder.id === id ? {
          ...reminder,
          ...updatedReminder,
          // Preserve linkedItems with priority on those from update
          linkedItems: updatedReminder.linkedItems || reminder.linkedItems
        } : reminder))
      );

      await createActivity({
        actionType: 'edit',
        itemType: 'reminder',
        itemId: updatedReminder.id,
        itemTitle: updatedReminder.title,
        description: `Updated reminder: ${updatedReminder.title}`,
        metadata: { tags: updatedReminder.tags },
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
      throw error;
    }
  }, [createActivity]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const reminderToDelete = reminders.find(reminder => reminder.id === id);
      if (!reminderToDelete) return;

      await reminderService.updateReminder(id, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        title: reminderToDelete.title,
        description: reminderToDelete.description,
        dueDateTime: reminderToDelete.dueDateTime,
        tags: reminderToDelete.tags,
        isCompleted: reminderToDelete.isCompleted
      });

      await moveToTrash({
        id: reminderToDelete.id,
        type: 'reminder',
        title: reminderToDelete.title,
        content: reminderToDelete.description,
        metadata: {
          dueDate: reminderToDelete.dueDateTime,
          tags: reminderToDelete.tags
        }
      });

      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      await createActivity({
        actionType: 'delete',
        itemType: 'reminder',
        itemId: id,
        itemTitle: reminderToDelete.title,
        description: `Moved reminder to trash: ${reminderToDelete.title}`,
        metadata: {
          reminderId: id,
          reminderTitle: reminderToDelete.title,
          reminderDueDate: reminderToDelete.dueDateTime,
          reminderTags: reminderToDelete.tags,
          reminderStatus: reminderToDelete.isCompleted ? 'completed' : 'pending',
          deletedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      throw error;
    }
  }, [reminders, moveToTrash, createActivity]);

  const deleteReminderPermanently = useCallback(async (id: string) => {
    try {
      const reminderToDelete = reminders.find(reminder => reminder.id === id);
      if (!reminderToDelete) return;

      await reminderService.deleteReminderPermanently(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      await createActivity({
        actionType: 'DELETE_PERMANENT',
        itemType: 'REMINDER',
        itemId: id,
        itemTitle: reminderToDelete.title,
        description: `Permanently deleted reminder: ${reminderToDelete.title}`,
        metadata: {
          reminderId: id,
          reminderTitle: reminderToDelete.title,
          dueDateTime: reminderToDelete.dueDateTime,
          tags: reminderToDelete.tags,
          isCompleted: reminderToDelete.isCompleted,
          deletedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to permanently delete reminder:', error);
      throw error;
    }
  }, [reminders, createActivity]);

  const snoozeReminder = useCallback(async (id: string, until: string) => {
    try {
      await updateReminder(id, { isSnoozed: true, snoozeUntil: until });
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
      throw error;
    }
  }, [updateReminder]);

  const toggleReminderCompletion = useCallback(async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    try {
      await updateReminder(id, {
        isCompleted: !reminder.isCompleted,
        completedAt: !reminder.isCompleted ? new Date().toISOString() : undefined,
      });
    } catch (error) {
      console.error('Failed to toggle reminder completion:', error);
      throw error;
    }
  }, [reminders, updateReminder]);

  const getDueReminders = useCallback(() => {
    const now = new Date();
    return reminders.filter(reminder => {
      if (reminder.isCompleted) return false;
      if (reminder.isSnoozed && reminder.snoozeUntil) {
        return new Date(reminder.snoozeUntil) <= now;
      }
      return new Date(reminder.dueDateTime) <= now;
    });
  }, [reminders]);

  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return reminders.filter(reminder => {
      if (reminder.isCompleted) return false;
      const dueDate = new Date(reminder.dueDateTime);
      return dueDate > now && dueDate <= tomorrow;
    });
  }, [reminders]);

  const restoreReminder = useCallback(async (reminder: Reminder) => {
    try {
      await reminderService.updateReminder(reminder.id, {
        isDeleted: false,
        deletedAt: undefined
      });

      await fetchReminders();

      await createActivity({
        actionType: 'restore',
        itemType: 'reminder',
        itemId: reminder.id,
        itemTitle: reminder.title,
        description: `Restored reminder: ${reminder.title}`,
        metadata: { tags: reminder.tags }
      });
    } catch (error) {
      console.error('Failed to restore reminder:', error);
      throw error;
    }
  }, [createActivity, fetchReminders]);

  const addReminderLink = useCallback(async (reminderId: string, linkedItemId: string, linkType: string) => {
    try {

      // Track if this is an idea link for special handling
      const isIdeaLink = linkType === 'idea';

      const updatedReminder = await reminderService.addReminderLink({
        reminderId,
        linkedItemId,
        itemType: linkType as "note" | "idea",
      });

      // Special handling for idea links to force full refresh
      if (isIdeaLink) {
        // Get the complete, fresh list of reminders to ensure all related data is updated
        const freshReminders = await reminderService.getReminders();

        // Find our specific updated reminder in the fresh data
        const freshReminder = freshReminders.find(r => r.id === reminderId);

        if (freshReminder) {
          // Update with complete fresh data
          setReminders(prev =>
            prev.map(r => r.id === reminderId ? {
              ...freshReminder,
              // Ensure the reminder has correct tags format
              tags: freshReminder.tags || [],
            } : r)
          );
        } else {
          console.warn('Could not find fresh reminder data - using API response');
          // Fall back to original update if fresh data not found
          setReminders(prev => prev.map(reminder =>
            reminder.id === reminderId ? {
              ...updatedReminder,
              linkedItems: updatedReminder.linkedItems || [],
              tags: updatedReminder.tags || [],
            } : reminder
          ));
        }
      } else {
        // Standard update for note links
        setReminders(prev => prev.map(reminder =>
          reminder.id === reminderId ? {
            ...updatedReminder,
            linkedItems: updatedReminder.linkedItems || [],
            tags: updatedReminder.tags || [],
          } : reminder
        ));
      }

      await createActivity({
        actionType: 'link',
        itemType: 'reminder',
        itemId: reminderId,
        itemTitle: updatedReminder.title,
        description: `Linked ${linkType} to reminder: ${updatedReminder.title}`,
        metadata: {
          linkedItemId,
          linkType,
        },
      });
    } catch (error) {
      console.error('Failed to add reminder link:', error);
      throw error;
    }
  }, [createActivity]);

  const removeReminderLink = useCallback(async (reminderId: string, linkedItemId: string) => {
    try {
      const updatedReminder = await reminderService.removeReminderLink(reminderId, linkedItemId);

      // Update the reminders state by removing the link
      setReminders(prev => prev.map(reminder =>
        reminder.id === reminderId ? updatedReminder : reminder
      ));

      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        await createActivity({
          actionType: 'unlink',
          itemType: 'reminder',
          itemId: reminderId,
          itemTitle: reminder.title,
          description: `Unlinked item from reminder: ${reminder.title}`,
          metadata: {
            linkedItemId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to remove reminder link:', error);
      throw error;
    }
  }, [reminders, createActivity]);

  const value = useMemo(() => ({
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    snoozeReminder,
    toggleReminderCompletion,
    getDueReminders,
    getUpcomingReminders,
    restoreReminder,
    fetchReminders,
    isLoading,
    deleteReminderPermanently,
    addReminderLink,
    removeReminderLink
  }), [
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    snoozeReminder,
    toggleReminderCompletion,
    getDueReminders,
    getUpcomingReminders,
    restoreReminder,
    fetchReminders,
    isLoading,
    deleteReminderPermanently,
    addReminderLink,
    removeReminderLink
  ]);

  return (
    <RemindersContext.Provider value={value}>
      {children}
    </RemindersContext.Provider>
  );
}