import { useState } from 'react';
import { TrashedItem } from '../../../contexts/trashContextUtils';
import { NoteCard } from '../NoteCard';
import { TaskCard } from '../Tasks/TaskCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import { ReminderCard } from '../Reminders/ReminderCard';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Trash2, RotateCcw } from 'lucide-react';
import type { Note } from '../../../types/note';
import type { Task, TaskStatus, TaskPriority } from '../../../api/types/task';
import type { Reminder } from '../../../contexts/remindersContextUtils';

interface TrashListProps {
  trashedItems: TrashedItem[];
  filters: {
    types: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
    tags: string[];
  };
  searchQuery: string;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onRestore: (items: string[]) => void;
  onDelete: (items: string[]) => void;
}

export function TrashList({ 
  trashedItems,
  filters, 
  searchQuery,
  selectedItems,
  onSelectionChange,
  onRestore,
  onDelete
}: TrashListProps) {
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const filteredItems = trashedItems.filter(item => {
    // Search filter
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.type === 'reminder' && item.metadata?.dueDate && 
       new Date(item.metadata.dueDate).toLocaleDateString().toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter
    const matchesType = filters.types.length === 0 || filters.types.includes(item.type);

    // Tag filter - handle both direct tags and metadata tags
    const itemTags = item.metadata?.tags || [];
    const matchesTags = filters.tags.length === 0 ||
      filters.tags.some(tag => itemTags.includes(tag));

    // Date range filter
    let matchesDateRange = true;
    const deletedDate = new Date(item.deletedAt);
    const now = new Date();

    if (filters.dateRange !== 'all') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (filters.dateRange) {
        case 'today':
          matchesDateRange = deletedDate >= startOfDay;
          break;
        case 'week':
          matchesDateRange = deletedDate >= startOfWeek;
          break;
        case 'month':
          matchesDateRange = deletedDate >= startOfMonth;
          break;
      }
    }

    return matchesSearch && matchesType && matchesTags && matchesDateRange;
  });

  // Sort items by deletion date, newest first
  const sortedItems = [...filteredItems].sort((a, b) => 
    new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  const handleItemClick = (itemId: string) => {
    onSelectionChange(
      selectedItems.includes(itemId)
        ? selectedItems.filter(id => id !== itemId)
        : [...selectedItems, itemId]
    );
  };

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery || filters.types.length > 0 || filters.tags.length > 0
            ? "No items match your search criteria"
            : "Trash is empty"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-4 p-4 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedItems.length} items selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => onRestore(selectedItems)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Selected</span>
          </button>
          <button
            onClick={() => onDelete(selectedItems)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map(item => {
          // Convert TrashedItem to the appropriate type
          switch (item.type) {
            case 'note': {
              const note: Note = {
                id: item.id,
                title: item.title,
                content: item.content ?? '',
                tags: item.metadata?.tags || [],
                isFavorite: item.metadata?.isFavorite || false,
                isPinned: false,
                isIdea: false,
                linkedNoteIds: item.metadata?.linkedItems || [],
                linkedTasks: [],
                linkedReminders: [],
                isArchived: false,
                isDeleted: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              return (
                <NoteCard
                  key={item.id}
                  note={note}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={() => handleItemClick(item.id)}
                  context="trash"
                />
              );
            }
            case 'task': {
              const status = (item.metadata?.status ?? 'Incomplete') as TaskStatus;
              const priority = (item.metadata?.priority ?? 'low') as TaskPriority;
              
              const task: Task = {
                id: item.id,
                title: item.title,
                description: item.content ?? '',
                status,
                priority,
                dueDate: item.metadata?.dueDate ?? null,
                tags: item.metadata?.tags || [],
                linkedItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDeleted: true,
                deletedAt: item.deletedAt
              };
              return (
                <TaskCard
                  key={item.id}
                  task={task}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={() => handleItemClick(item.id)}
                  context="trash"
                />
              );
            }
            case 'idea': {
              const idea: Note = {
                id: item.id,
                title: item.title,
                content: item.content ?? '',
                tags: item.metadata?.tags || [],
                isFavorite: item.metadata?.isFavorite || false,
                isPinned: false,
                isIdea: true,
                linkedNoteIds: item.metadata?.linkedItems || [],
                linkedTasks: [],
                linkedReminders: [],
                isArchived: false,
                isDeleted: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              return (
                <IdeaCard
                  key={item.id}
                  idea={idea}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={() => handleItemClick(item.id)}
                  context="trash"
                />
              );
            }
            case 'reminder': {
              const reminder: Reminder = {
                id: item.id,
                title: item.title,
                description: item.content ?? '',
                dueDateTime: item.metadata?.dueDate ?? new Date().toISOString(),
                isCompleted: item.metadata?.isCompleted || false,
                isSnoozed: item.metadata?.isSnoozed || false,
                snoozeUntil: item.metadata?.snoozeUntil,
                repeatInterval: undefined,
                tags: item.metadata?.tags || [],
                linkedItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDeleted: true,
                userId: ''
              };
              return (
                <ReminderCard
                  key={item.id}
                  reminder={reminder}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={() => handleItemClick(item.id)}
                  context="trash"
                />
              );
            }
            default:
              return null;
          }
        })}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        onConfirm={() => onRestore(selectedItems)}
        title="Restore Items"
        description={`Are you sure you want to restore ${selectedItems.length} selected ${
          selectedItems.length === 1 ? 'item' : 'items'
        }?`}
        confirmLabel="Restore"
        confirmIcon={RotateCcw}
      />

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => onDelete(selectedItems)}
        title="Delete Items Permanently"
        description={`Are you sure you want to permanently delete ${selectedItems.length} selected ${
          selectedItems.length === 1 ? 'item' : 'items'
        }? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmIcon={Trash2}
        isDangerous
      />
    </div>
  );
}