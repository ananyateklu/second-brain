import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Clock, Star, Pin } from 'lucide-react';
import { NewNoteModal } from './Notes/NewNoteModal';
import { useNotes } from '../../contexts/NotesContext';

export function WelcomeBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { notes, addNote } = useNotes();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);

  // Don't show on main dashboard
  if (location.pathname === '/dashboard') return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = {
    pinnedCount: notes.filter(note => note.isPinned).length,
    favoriteCount: notes.filter(note => note.isFavorite).length,
    recentCount: notes.filter(note => {
      const noteDate = new Date(note.updatedAt);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return noteDate > dayAgo;
    }).length
  };

  const handleCreateNote = async (note: { title: string; content: string; tags: string[] }) => {
    addNote(note);
    setShowNewNoteModal(false);
  };

  return (
    <>
      <div className="glass-morphism p-4 rounded-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {getGreeting()}, {user?.name}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Pin className="w-3.5 h-3.5" />
                  <span>{stats.pinnedCount} pinned</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-3.5 h-3.5" />
                  <span>{stats.favoriteCount} favorites</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{stats.recentCount} today</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowNewNoteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
        onCreateNote={handleCreateNote}
      />
    </>
  );
}