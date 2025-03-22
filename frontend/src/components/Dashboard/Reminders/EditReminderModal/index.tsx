import { useState } from 'react';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { Reminder } from '../../../../api/types/reminder';
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
  const { updateReminder, deleteReminder, addReminderLink, removeReminderLink } = useReminders();
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
      await addReminderLink(reminder.id, itemId, itemType);
      const updatedReminder = { ...reminder };
      updatedReminder.linkedItems = [...reminder.linkedItems, {
        id: itemId,
        type: itemType,
        title: '', // This will be updated when the state refreshes
        createdAt: new Date().toISOString()
      }];
      setReminder(updatedReminder);
      setIsAddLinkOpen(false);
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  const handleUnlink = async (itemId: string) => {
    try {
      await removeReminderLink(reminder.id, itemId);
      const updatedReminder = { ...reminder };
      updatedReminder.linkedItems = reminder.linkedItems.filter(item => item.id !== itemId);
      setReminder(updatedReminder);
    } catch (error) {
      console.error('Failed to remove link:', error);
    }
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

        <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
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