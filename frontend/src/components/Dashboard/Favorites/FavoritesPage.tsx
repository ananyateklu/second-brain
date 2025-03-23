import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { NoteCard } from '../NoteCard';
import { IdeaCard } from '../Ideas/IdeaCard';
import type { Note } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useModal } from '../../../contexts/modalContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { cardVariants } from '../../../utils/welcomeBarUtils';
import { cardGridStyles } from '../shared/cardStyles';

export function FavoritesPage() {
  const { notes } = useNotes();
  const { setSelectedNote, setSelectedIdea } = useModal();
  const { theme } = useTheme();
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

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <div className="min-h-screen overflow-visible bg-fixed">
      {/* Background */}
      <div className="fixed inset-0 bg-[var(--color-background)] -z-10" />

      <div className="space-y-8 relative w-full">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className={`
            relative 
            overflow-visible 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          <motion.div
            variants={cardVariants}
            className="flex items-center gap-3"
          >
            <div className="p-2.5 bg-amber-100/20 dark:bg-amber-900/20 midnight:bg-amber-900/20 rounded-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 midnight:ring-white/10">
              <Star className="w-6 h-6 text-amber-600 dark:text-amber-400 midnight:text-amber-300" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Favorites</h1>
              <p className="text-sm text-[var(--color-textSecondary)]">
                {favoriteNotes.length} items in your favorites
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          variants={cardVariants}
          className={`
            relative 
            overflow-visible 
            rounded-2xl 
            ${getContainerBackground()}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
            dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
            ring-1
            ring-white/5
            transition-all 
            duration-300 
            p-6
          `}
        >
          {favoriteNotes.length > 0 ? (
            <div className={cardGridStyles}>
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="w-12 h-12 text-amber-400/50 dark:text-amber-500/30 mb-4" />
              <p className="text-[var(--color-textSecondary)]">
                No favorite notes yet. Click the star icon on any note to add it to your favorites.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}