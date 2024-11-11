import React, { useState, useMemo } from 'react';
import { X, Link2, Calendar, Tag, Plus, Type, Lightbulb } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { AddLinkModal } from './AddLinkModal';
import { Note } from '../../../types/note';

interface NoteDetailsPanelProps {
  selectedNoteId: string;
  onClose: () => void;
}

export function NoteDetailsPanel({ selectedNoteId, onClose }: NoteDetailsPanelProps) {
  const { notes, removeLink } = useNotes();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  
  const note = notes.find(n => n.id === selectedNoteId);
  const isIdea = note?.tags?.includes('idea');

  const linkedNotes = useMemo(() => {
    if (!note?.linkedNoteIds) return [];
    return note.linkedNoteIds
      .map(id => {
        const linkedNote = notes.find(n => n.id === id);
        if (!linkedNote) return null;
        return {
          ...linkedNote,
          isIdea: linkedNote.tags?.includes('idea')
        };
      })
      .filter((n): n is (Note & { isIdea: boolean }) => n !== null);
  }, [note, notes]);

  const handleUnlink = async (linkedNoteId: string) => {
    try {
      if (!selectedNoteId) {
        console.error('Missing selectedNoteId');
        return;
      }
      console.log('Unlinking with IDs:', { selectedNoteId, linkedNoteId });
      await removeLink(selectedNoteId, linkedNoteId);
    } catch (error) {
      console.error('Failed to unlink note:', error);
    }
  };

  if (!note) return null;

  return (
    <div className="h-full flex flex-col bg-white/20 dark:bg-gray-800/20 border-l border-gray-200/50 dark:border-gray-700/30 overflow-hidden shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isIdea ? (
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {isIdea ? 'Idea Details' : 'Note Details'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 relative">
        <div className="space-y-3">
          {/* Title and Metadata */}
          <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 p-3 rounded-xl shadow-sm hover:shadow hover:border-primary-400/50 dark:hover:border-primary-400/50 transition-all">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {note.title}
            </h4>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(note.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                <span>{note.linkedNoteIds?.length || 0} links</span>
              </div>
            </div>
          </div>

          {/* Connected Notes */}
          <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 p-3 rounded-xl shadow-sm hover:shadow hover:border-primary-400/50 dark:hover:border-primary-400/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                Connected ({linkedNotes.length})
              </h5>
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-2">
              {linkedNotes.length > 0 ? (
                linkedNotes.map(linkedNote => (
                  <div
                    key={linkedNote.id}
                    className="group relative p-2 rounded-lg bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm hover:shadow hover:border-primary-400/50 dark:hover:border-primary-400/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        linkedNote.isIdea 
                          ? 'bg-amber-100 dark:bg-amber-900/30' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {linkedNote.isIdea ? (
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnlink(linkedNote.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No connected notes or ideas yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        sourceNoteId={selectedNoteId}
        onLinkAdded={() => setShowAddLinkModal(false)}
      />
    </div>
  );
}
