import React from 'react';
import { Star, Link2, Tag, ChevronRight, Lightbulb } from 'lucide-react';
import { Note } from '../../../contexts/NotesContext';
import { formatDate } from '../../../utils/dateUtils';

interface IdeasListProps {
  ideas: Note[];
  onIdeaClick: (ideaId: string) => void;
}

export function IdeasList({ ideas, onIdeaClick }: IdeasListProps) {
  return (
    <div className="space-y-4">
      {ideas.map(idea => (
        <div
          key={idea.id}
          onClick={() => onIdeaClick(idea.id)}
          className="group bg-white dark:bg-dark-card rounded-xl p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors">
                  {idea.title}
                </h3>
                {idea.isFavorite && (
                  <Star className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="currentColor" />
                )}
              </div>

              <p className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                {idea.content}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {idea.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  <span>{idea.linkedNotes?.length || 0} connections</span>
                </div>
                <span>{formatDate(idea.updatedAt)}</span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
}