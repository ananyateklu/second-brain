import React from 'react';
import { Star } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { useNotes } from '../../../contexts/NotesContext';

export function FavoritesPage() {
  const { notes } = useNotes();
  const favoriteNotes = notes.filter(note => note.isFavorite);

  return (
    <div className="space-y-6">
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Favorite Notes
          </h2>
        </div>

        {favoriteNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No favorite notes yet. Click the star icon on any note to add it to your favorites.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}