import { memo } from 'react';
import { NoteCard } from './NoteCard';
import { NoteListItem } from './NoteListItem';
import { Note } from '../types/note';
import { NotesViewMode } from '../../../store/ui-store';

interface NoteListProps {
  notes: Note[];
  viewMode?: NotesViewMode;
  isBulkMode?: boolean;
  selectedNoteIds?: Set<string>;
  onNoteSelect?: (noteId: string) => void;
}

export const NoteList = memo(function NoteList({
  notes,
  viewMode = 'card',
  isBulkMode = false,
  selectedNoteIds,
  onNoteSelect,
}: NoteListProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {notes.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            isBulkMode={isBulkMode}
            isSelected={selectedNoteIds?.has(note.id) ?? false}
            onSelect={onNoteSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isBulkMode={isBulkMode}
          isSelected={selectedNoteIds?.has(note.id) ?? false}
          onSelect={onNoteSelect}
        />
      ))}
    </div>
  );
});

