import React from 'react';
import { NoteCard, Note } from './NoteCard';

const MOCK_FAVORITES: Note[] = [
  {
    id: '1',
    title: 'Important Project Ideas',
    content: 'List of potential project ideas for Q2 2024...',
    tags: ['Projects', 'Ideas', 'Planning'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T15:30:00Z',
    isPinned: true
  },
  {
    id: '2',
    title: 'Meeting Notes Template',
    content: 'Standard template for team meetings including agenda items...',
    tags: ['Templates', 'Meetings'],
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
    isPinned: true
  }
];

export function FavoritesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Favorite Notes
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_FAVORITES.map(note => (
          <NoteCard key={note.id} note={note} />
        ))}
        {MOCK_FAVORITES.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No favorite notes yet. Star your important notes to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}