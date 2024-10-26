import React, { useState } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';

export function LinkedNotesPage() {
  const { notes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const handleNodeSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsDetailsVisible(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsVisible(false);
    setTimeout(() => setSelectedNoteId(null), 300); // Wait for animation to complete
  };

  const linkedNotesCount = notes.filter(note => 
    note.linkedNotes && note.linkedNotes.length > 0
  ).length;

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Linked Notes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {linkedNotesCount} notes with connections
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('graph')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'graph'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Graph View"
          >
            <Network className="w-5 h-5" />
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
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div 
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${
            isDetailsVisible ? 'right-[327px]' : 'right-0'
          }`}
        >
          <div className="h-full glass-morphism rounded-xl overflow-hidden">
            {viewMode === 'graph' ? (
              notes.length > 0 ? (
                <GraphView 
                  onNodeSelect={handleNodeSelect} 
                  isDetailsPanelOpen={isDetailsVisible}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No notes available to display
                  </p>
                </div>
              )
            ) : (
              <ListView onNoteSelect={handleNodeSelect} />
            )}
          </div>
        </div>
        
        <div 
          className={`absolute top-0 bottom-0 right-0 w-[320px] transition-all duration-300 ease-in-out transform ${
            isDetailsVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedNoteId && (
            <div className="h-full ml-2 glass-morphism rounded-xl overflow-hidden">
              <NoteDetailsPanel
                selectedNoteId={selectedNoteId}
                onClose={handleCloseDetails}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}