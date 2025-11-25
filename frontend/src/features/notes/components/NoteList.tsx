import { memo } from 'react';
import { NoteCard } from './NoteCard';
import { Note } from '../types/note';

interface NoteListProps {
  notes: Note[];
}

export const NoteList = memo(function NoteList({ notes }: NoteListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
});

