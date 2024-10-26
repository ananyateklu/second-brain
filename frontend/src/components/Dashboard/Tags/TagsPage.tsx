import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, Hash } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';

export function TagsPage() {
  const navigate = useNavigate();
  const { notes } = useNotes();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tagStats = useMemo(() => {
    if (!notes) return [];
    
    const stats = new Map<string, number>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });

    return Array.from(stats.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!selectedTag || !notes) return [];
    return notes.filter(note => note.tags.includes(selectedTag));
  }, [selectedTag, notes]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Tag className="w-6 h-6 text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tags List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
              <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Tags</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {tagStats.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                      selectedTag === tag
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span>{tag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes with Selected Tag */}
          <div className="lg:col-span-2">
            {selectedTag ? (
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notes tagged with "{selectedTag}"
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-dark-border">
                  {filteredNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/dashboard/notes/${note.id}`)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer"
                    >
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {note.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {note.content}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
                <div className="text-center">
                  <Tag className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a tag to view related notes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagsPage;