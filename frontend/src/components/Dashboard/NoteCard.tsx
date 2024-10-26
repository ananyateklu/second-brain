import React from 'react';
import { Clock, Tag as TagIcon, Star, Pin, FileText, Lightbulb, Archive } from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
}

interface NoteCardProps {
  note: Note;
  viewMode?: 'grid' | 'list';
}

export function NoteCard({ note, viewMode = 'grid' }: NoteCardProps) {
  const { togglePinNote, toggleFavoriteNote, archiveNote } = useNotes();

  if (!note) return null;

  const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isIdea = note.tags.includes('idea');

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveNote(note.id);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinNote(note.id);
  };

  return (
    <div className={`
      group relative overflow-hidden bg-white dark:bg-dark-card rounded-xl hover-card
      ${viewMode === 'list' ? 'flex gap-4' : ''}
    `}>
      <div className="absolute inset-0 gradient-border opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-5 sm:p-6 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                isIdea 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {isIdea ? (
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors duration-300">
                {note.title}
              </h3>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-2 text-sm sm:text-base">
              {note.content}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handlePin}
              className={`p-1.5 rounded-lg transition-colors ${
                note.isPinned
                  ? 'text-primary-600 dark:text-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className="w-4 h-4" fill={note.isPinned ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleFavorite}
              className={`p-1.5 rounded-lg transition-colors ${
                note.isFavorite
                  ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-400 hover:text-amber-500 dark:text-gray-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-4 h-4" fill={note.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleArchive}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              title="Archive note"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {note.tags && note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {note.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
              >
                <TagIcon className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span>Last edited {formattedDate}</span>
        </div>
      </div>
    </div>
  );
}