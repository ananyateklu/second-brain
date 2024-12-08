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

      <div className="flex flex-col h-full p-0.5">
        {/* Header */}
        <div className="flex-none relative overflow-hidden rounded-lg bg-white/20 dark:bg-gray-800/20 border border-white/40 dark:border-white/30 shadow-sm mb-2 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white/20 dark:bg-gray-800/20 border border-white/40 dark:border-white/30 shadow-sm rounded-xl overflow-hidden backdrop-blur-xl">
          <div className="h-full p-4 overflow-y-auto">
            {favoriteNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => handleEditNote(note)}
                    className="cursor-pointer w-full"
                  >
                    {note.isIdea ? (
                      <IdeaCard 
                        idea={note} 
                      />
                    ) : (
                      <NoteCard 
                        note={note}
                        viewMode="grid"
                      />
                    )}
                  </div>
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