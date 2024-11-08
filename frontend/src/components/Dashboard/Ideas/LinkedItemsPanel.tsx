import React from 'react';
import { Link2, Plus } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';

interface LinkedItemsPanelProps {
  linkedItems: Array<{ id: string; type: string; title: string }>;
  onShowAddLink: () => void;
  currentIdeaId: string;
  onUnlink: (itemId: string) => void;
}

export function LinkedItemsPanel({
  linkedItems,
  onShowAddLink,
  currentIdeaId,
  onUnlink
}: LinkedItemsPanelProps) {
  return (
    <div className="border-l border-gray-100/20 dark:border-white/5 p-4 space-y-4 glass-morphism">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Linked Items
        </h3>
        <button
          onClick={onShowAddLink}
          className="p-1 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {linkedItems.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-2 rounded-lg glass-morphism hover:bg-gray-50/50 dark:hover:bg-gray-800/50 group"
          >
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.type}
              </p>
            </div>
            <button
              onClick={() => onUnlink(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 