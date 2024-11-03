import React, { useState, useMemo } from 'react';
import { Lightbulb, Plus, Search, Grid, List, Network } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';
import { IdeasList } from './IdeasList';
import { IdeasGrid } from './IdeasGrid';
import { IdeasMindMap } from './IdeasMindMap';
import { NewIdeaModal } from './NewIdeaModal';
import { EditIdeaModal } from './EditIdeaModal';

type ViewMode = 'list' | 'grid' | 'mindmap';

export function IdeasPage() {
  const { notes } = useNotes();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  // Filter ideas (notes tagged with 'idea')
  const ideas = notes.filter(note => 
    note.isIdea === true && !note.isArchived &&
    (searchQuery
      ? note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true)
  );

  const handleIdeaClick = (ideaId: string) => {
    setSelectedIdeaId(ideaId);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Idea Incubator
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Capture and develop your creative ideas
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowNewIdeaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Idea</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('mindmap')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'mindmap'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Mind Map View"
          >
            <Network className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ideas Content */}
      <div className="min-h-[500px]">
        {viewMode === 'list' && (
          <IdeasList ideas={ideas} onIdeaClick={handleIdeaClick} />
        )}
        {viewMode === 'grid' && (
          <IdeasGrid ideas={ideas} onIdeaClick={handleIdeaClick} />
        )}
        {viewMode === 'mindmap' && (
          <IdeasMindMap ideas={ideas} onIdeaClick={handleIdeaClick} />
        )}

        {ideas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <Lightbulb className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No ideas yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Start capturing your ideas! Click the "New Idea" button to create your first idea.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewIdeaModal
        isOpen={showNewIdeaModal}
        onClose={() => setShowNewIdeaModal(false)}
      />

      <EditIdeaModal
        isOpen={selectedIdeaId !== null}
        onClose={() => setSelectedIdeaId(null)}
        ideaId={selectedIdeaId}
      />
    </div>
  );
}