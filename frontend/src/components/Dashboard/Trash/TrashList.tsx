import React, { useState } from 'react';
import { useTrash, TrashedItem } from '../../../contexts/TrashContext';
import { TrashItemCard } from './TrashItemCard';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Trash2, RotateCcw } from 'lucide-react';

interface TrashListProps {
  filters: {
    types: string[];
    dateRange: 'all' | 'today' | 'week' | 'month';
    tags: string[];
  };
  searchQuery: string;
}

export function TrashList({ filters, searchQuery }: TrashListProps) {
  const { trashedItems, restoreItems, deleteItemsPermanently } = useTrash();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
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

  const handleRestore = async () => {
    await restoreItems(selectedItems);
    setSelectedItems([]);
    setShowRestoreDialog(false);
  };

  const handleDelete = async () => {
    await deleteItemsPermanently(selectedItems);
    setSelectedItems([]);
    setShowDeleteDialog(false);
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  if (sortedItems.length === 0) {
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
            onClick={() => setShowRestoreDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Selected</span>
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedItems.map(item => (
          <TrashItemCard
            key={item.id}
            item={item}
            isSelected={selectedItems.includes(item.id)}
            onSelect={() => handleItemClick(item.id)}
            showMetadata={item.type === 'reminder'}
          />
        ))}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        onConfirm={handleRestore}
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
        onConfirm={handleDelete}
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