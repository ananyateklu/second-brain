import { useState } from 'react';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { Reminder } from '../../../../api/types/reminder';
import { reminderService } from '../../../../api/services/reminderService';
import { Save } from 'lucide-react';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedItemsPanel } from './LinkedItemsPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from './AddLinkModal';

interface EditReminderModalProps {
  reminder: Reminder;
  isOpen: boolean;
  onClose: () => void;
}

export function EditReminderModal({ reminder: initialReminder, isOpen, onClose }: EditReminderModalProps) {
  const { updateReminder, deleteReminder } = useReminders();
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
      await updateReminder(reminder.id, pendingChanges);
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
      const updatedReminder = await reminderService.addReminderLink({
        reminderId: reminder.id,
        linkedItemId: itemId,
        itemType: itemType,
        description: ''
      });
      setReminder(updatedReminder);
      setIsAddLinkOpen(false);
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  const handleUnlink = async (itemId: string) => {
    try {
      const updatedReminder = await reminderService.removeReminderLink(reminder.id, itemId);
      setReminder(updatedReminder);
    } catch (error) {
      console.error('Failed to remove link:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancel} />
        
        <div className="relative w-full max-w-4xl h-[calc(75vh-8rem)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl flex flex-col overflow-hidden">
          <Header
            reminder={{ ...reminder, ...pendingChanges }}
            onShowDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
            isSaving={isSaving}
          />

          <div className="flex flex-1 min-h-0">
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

          <div className="shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 flex items-center gap-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
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
    </>
  );
} 