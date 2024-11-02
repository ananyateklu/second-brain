import React, { useState, useMemo } from 'react';
import { X, Link2, Calendar, Tag, Plus } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';
import { AddLinkModal } from './AddLinkModal';
import { notesService } from '../../../services/api/notes.service';
import { Note } from '../../../types/note';

interface NoteDetailsPanelProps {
  selectedNoteId: string;
  onClose: () => void;
}

export function NoteDetailsPanel({ selectedNoteId, onClose }: NoteDetailsPanelProps) {
  const { notes, removeLink } = useNotes();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  
  const note = notes.find(n => n.id === selectedNoteId);
  
  console.log('Selected Note ID:', selectedNoteId);
  console.log('Found Note:', note);
  console.log('Linked Notes IDs:', note?.linkedNoteIds);
  console.log('All Notes:', notes);

  const linkedNotes = useMemo(() => {
    if (!note?.linkedNoteIds) return [];
    return note.linkedNoteIds
      .map(id => notes.find(n => n.id === id))
      .filter((n): n is Note => n !== undefined);
  }, [note, notes]);

  console.log('Processed Linked Notes:', linkedNotes);

  const handleUnlink = async (linkedNoteId: string) => {
    try {
      console.log('Unlinking notes with params:', {
        selectedNoteId,
        linkedNoteId,
        currentNote: note
      });

      // First, call the API service directly
      await notesService.removeLink(selectedNoteId, linkedNoteId);
      console.log('API call successful');

      // Then, update the local state through context
      await removeLink(selectedNoteId, linkedNoteId);
      console.log('Local state updated');
    } catch (error) {
      console.error('Failed to unlink note:', error);
    }
  };

  if (!note) return null;

  return (
    <>
      <div className="h-full flex flex-col bg-white dark:bg-dark-card">
        <div className="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Note Details
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div>
              <h4 className="text-xl font-medium text-gray-900 dark:text-white">
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

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300">{note.content}</p>
            </div>

            {note.tags && note.tags.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Tags
                </h5>
                <div className="flex flex-wrap gap-2">
                  {note.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                  Connected Notes ({linkedNotes.length})
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
                      className="group p-3 rounded-lg bg-gray-50 dark:bg-dark-hover hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlink(linkedNote.id);
                        }}
                        className="absolute right-2 top-2 p-1 rounded-lg bg-white/50 dark:bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-all"
                        title="Remove link"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <h6 className="font-medium text-gray-900 dark:text-white mb-1">
                        {linkedNote.title}
                      </h6>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {linkedNote.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No connected notes yet
                  </p>
                )}
              </div>
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
    </>
  );
}
