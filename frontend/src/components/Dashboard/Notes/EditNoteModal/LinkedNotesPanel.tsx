import React from 'react';
import { Link2, Plus, Type, X } from 'lucide-react';
import { Note } from '../../../../contexts/NotesContext';
import { useNotes } from '../../../../contexts/NotesContext';

interface LinkedNotesPanelProps {
  linkedNotes: Note[];
  onShowAddLink: () => void;
}

export function LinkedNotesPanel({ linkedNotes, onShowAddLink }: LinkedNotesPanelProps) {
  const { removeLink } = useNotes();

  return (
    <div className="border-l border-gray-200 dark:border-dark-border flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Connected Notes
            </h3>
          </div>
          <button
            type="button"
            onClick={onShowAddLink}
            className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-dark-hover">
        {linkedNotes.length > 0 ? (
          linkedNotes.map(linkedNote => (
            <div
              key={linkedNote.id}
              className="group relative p-3 rounded-lg bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h6 className="font-medium text-gray-900 dark:text-white truncate">
                    {linkedNote.title}
                  </h6>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {linkedNote.content}
                  </p>
                </div>
                <button
                  onClick={() => removeLink(linkedNote.id, 'targetId')}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No connected notes yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click "Add Link" to connect notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}