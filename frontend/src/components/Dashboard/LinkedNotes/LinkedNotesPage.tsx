import React, { useState, useEffect } from 'react';
import { GraphView } from './GraphView';
import { NoteDetailsPanel } from './NoteDetailsPanel';
import { ListView } from './ListView';
import { List, Network, Link2 } from 'lucide-react';
import { useNotes } from '../../../contexts/NotesContext';

export function LinkedNotesPage() {
  const { notes } = useNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  // Set initial node on mount
  useEffect(() => {
    if (notes.length > 0) {
      // Find the note with the most connections
      const mostConnectedNote = notes.reduce((prev, current) => {
        const prevConnections = prev.linkedNoteIds?.length || 0;
        const currentConnections = current.linkedNoteIds?.length || 0;
        return currentConnections > prevConnections ? current : prev;
      }, notes[0]);

      if (mostConnectedNote && mostConnectedNote.linkedNoteIds?.length) {
        setSelectedNoteId(mostConnectedNote.id);
        setIsDetailsVisible(true);
      }
    }
  }, [notes]);

  const handleNodeSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsDetailsVisible(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsVisible(false);
    setTimeout(() => setSelectedNoteId(null), 300); // Wait for animation
  };

  const linkedNotesCount = notes.filter(note => 
    note.linkedNotes && note.linkedNotes.length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Linked Notes
              </h1>
            </div>
            
            {/* Stats - Inline with header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 rounded-lg">
              <Link2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {linkedNotesCount} Connected Notes
              </span>
            </div>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('graph')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
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
              className={`p-2 rounded-lg transition-colors duration-200 ${
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
      </div>

      {/* Main Content Area */}
      <div className="bg-white/20 dark:bg-gray-800/20 border border-gray-200/50 dark:border-gray-700/30 shadow-sm rounded-xl">
        <div className="h-[calc(100vh-12rem)] relative flex">
          {/* Graph Container - Modified to stay left-aligned */}
          <div 
            className={`flex-1 transition-all duration-300 ease-in-out ${
              isDetailsVisible ? 'mr-96' : ''
            }`}
            style={{ 
              overflow: 'hidden',
              marginLeft: '0' // Ensure left alignment
            }}
          >
            {viewMode === 'graph' ? (
              notes.length > 0 ? (
                <GraphView 
                  onNodeSelect={handleNodeSelect} 
                  isDetailsPanelOpen={isDetailsVisible}
                  selectedNoteId={selectedNoteId}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <Link2 className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No connected notes to display
                  </p>
                </div>
              )
            ) : (
              <ListView onNoteSelect={handleNodeSelect} />
            )}
          </div>
          
          {/* Details Panel - Modified to use absolute positioning */}
          <div 
            className={`absolute top-0 right-0 bottom-0 w-96 transition-all duration-300 ease-in-out ${
              isDetailsVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedNoteId && (
              <div className="h-full">
                <NoteDetailsPanel
                  selectedNoteId={selectedNoteId}
                  onClose={handleCloseDetails}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}