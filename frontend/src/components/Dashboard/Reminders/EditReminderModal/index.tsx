import { useState } from 'react';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { Reminder } from '../../../../api/types/reminder';
import { reminderService } from '../../../../api/services/reminderService';
import { Save } from 'lucide-react';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedItemsPanel } from './LinkedItemsPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from './AddLinkModal';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface EditReminderModalProps {
  reminder: Reminder;
  isOpen: boolean;
  onClose: () => void;
}

export function EditReminderModal({ reminder: initialReminder, isOpen, onClose }: EditReminderModalProps) {
  const { updateReminder, deleteReminder, addReminderLink, removeReminderLink } = useReminders();
  const { notes } = useNotes();
  const { theme } = useTheme();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Reminder>>({});
  const [reminder, setReminder] = useState(initialReminder);

  if (!isOpen) return null;

  const handleUpdate = async (updates: Partial<Reminder>) => {
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);


      // Make sure to include the current linkedItems in the save operation
      const updatesToSave = {
        ...pendingChanges,
        // Include the current linkedItems to prevent them from being lost
        linkedItems: reminder.linkedItems || []
      };

      await updateReminder(reminder.id, updatesToSave);
      setPendingChanges({});
      onClose();
    } catch (error) {
      console.error('Failed to save reminder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingChanges({});
    onClose();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteReminder(reminder.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddLink = async (itemId: string, itemType: 'note' | 'idea') => {
    try {
      // Save current linked items to ensure we don't lose any
      const currentLinkedItems = [...reminder.linkedItems];

      // Call the API to add the link
      await addReminderLink(reminder.id, itemId, itemType);

      // Find the note or idea to get its title
      const linkedItem = notes.find(note => note.id === itemId);

      // Get latest data with fresh reminders
      const latestReminders = await reminderService.getReminders();
      const updatedReminder = latestReminders.find((r: Reminder) => r.id === reminder.id);

      if (updatedReminder && updatedReminder.linkedItems && updatedReminder.linkedItems.length > 0) {

        // Create a merged version that includes both previously linked items and new ones
        // This ensures we don't lose any linked items that might not be in the response
        const existingIds = new Set(currentLinkedItems.map(item => item.id));
        const newItems = updatedReminder.linkedItems.filter(item => !existingIds.has(item.id));

        const mergedLinkedItems = [
          ...currentLinkedItems,
          ...newItems
        ];

        // Update with merged linked items
        setReminder({
          ...updatedReminder,
          linkedItems: mergedLinkedItems
        });
      } else {
        // Create new linked item
        const newLinkedItem = {
          id: itemId,
          type: itemType,
          title: linkedItem?.title || 'Untitled',
          createdAt: new Date().toISOString()
        };

        // Ensure we preserve all existing linked items and add the new one
        setReminder({
          ...reminder,
          linkedItems: [...currentLinkedItems, newLinkedItem]
        });
      }

      setIsAddLinkOpen(false);
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  const handleUnlink = async (itemId: string) => {
    try {
      // Call the API to remove the link
      await removeReminderLink(reminder.id, itemId);

      // Update local state immediately to reflect the change without requiring a page reload
      const updatedReminder = { ...reminder };
      updatedReminder.linkedItems = reminder.linkedItems.filter(item => item.id !== itemId);
      setReminder(updatedReminder);
    } catch (error) {
      console.error('Failed to remove link:', error);
    }
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]">
        <Header
          reminder={{ ...reminder, ...pendingChanges }}
          onShowDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          onClose={onClose}
          isSaving={isSaving}
        />

        <div className="flex-1 grid grid-cols-[1fr,360px] min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <MainContent
              reminder={{ ...reminder, ...pendingChanges }}
              onUpdate={handleUpdate}
            />
          </div>

          <LinkedItemsPanel
            linkedItems={reminder.linkedItems}
            onShowAddLink={() => setIsAddLinkOpen(true)}
            onUnlink={handleUnlink}
          />
        </div>

        <div className={`shrink-0 flex justify-end gap-3 px-6 py-4 border-t ${getBorderStyle()} bg-[var(--color-surface)]`}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-reminder)] hover:bg-[var(--color-reminder)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        isLoading={isDeleting}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <AddLinkModal
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        onAddLink={handleAddLink}
        existingLinkedItemIds={reminder.linkedItems.map(item => item.id)}
      />
    </div>
  );
} 