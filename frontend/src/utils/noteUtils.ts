import { Note } from '../types/note';

export const sortNotes = (notes: Note[]): Note[] => {
  return [...notes].sort((a, b) => {
    // First, sort by pinned status
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then, sort by favorite status
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    // Finally, sort by updatedAt date (most recent first)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}; 