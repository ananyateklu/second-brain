import { Star } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import type { Note } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useModal } from '../../../contexts/modalContextUtils';

export function FavoritesPage() {
  const { notes } = useNotes();
  const { setSelectedNote, setSelectedIdea } = useModal();
  const favoriteNotes = notes.filter(note => note.isFavorite);

  const handleEditNote = (note: Note) => {
    const fullNote: Note = {
      ...note,
      isIdea: note.isIdea || false,
      linkedNotes: note.linkedNotes || []
    };
    if (note.isIdea) {
      setSelectedIdea(fullNote);
    } else {
      setSelectedNote(fullNote);
    }
  };

  return (
    <div className="h-[calc(100vh-9rem)] overflow-hidden bg-fixed">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-fixed dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-slate-800 bg-gradient-to-br from-white to-gray-100 -z-10" />

      <div className="px-6 space-y-8 relative">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />
          <div className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
                <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Favorites</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {favoriteNotes.length} items
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative overflow-hidden rounded-xl bg-white/20 dark:bg-gray-800/20 border border-gray-200/30 dark:border-gray-700/30 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]">
          <div className="p-6">
            {favoriteNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteNotes.map(note => (
                  note.isIdea ? (
                    <IdeaCard 
                      key={note.id}
                      idea={note} 
                      viewMode="grid"
                      onClick={() => handleEditNote(note)}
                    />
                  ) : (
                    <NoteCard 
                      key={note.id}
                      note={note}
                      viewMode="grid"
                      onClick={() => handleEditNote(note)}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Star className="w-12 h-12 text-amber-400/50 dark:text-amber-500/30 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No favorite notes yet. Click the star icon on any note to add it to your favorites.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}