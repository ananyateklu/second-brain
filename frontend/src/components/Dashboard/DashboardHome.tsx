import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ChevronRight,
  PinIcon,
  Plus,
  TagIcon,
  FileText,
  Search
} from 'lucide-react';
import { useNotes } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';
import { NoteCard } from './NoteCard';
import { NewNoteModal } from './Notes/NewNoteModal';
import { EditNoteModal } from './Notes/EditNoteModal';

export function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notes } = useNotes();
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const stats = {
    totalNotes: notes.length,
    newThisWeek: notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length,
    pinnedNotes: notes.filter(note => note.isPinned),
    lastUpdated: notes.length > 0 
      ? new Date(Math.max(...notes.map(note => new Date(note.updatedAt).getTime())))
      : null
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
  };

  const handleCloseEditModal = () => {
    setSelectedNote(null);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-morphism p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {getGreeting()}, {user?.name}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Here's what's happening with your notes today
            </p>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/dashboard/notes')}
          className="glass-morphism p-4 rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Notes</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.totalNotes}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/dashboard/notes')}
          className="glass-morphism p-4 rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">New this week</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                +{stats.newThisWeek}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/dashboard/tags')}
          className="glass-morphism p-4 rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TagIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {new Set(notes.flatMap(note => note.tags)).size}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            const lastUpdatedNote = notes.find(note => 
              new Date(note.updatedAt).getTime() === stats.lastUpdated?.getTime()
            );
            if (lastUpdatedNote) {
              handleEditNote(lastUpdatedNote);
            }
          }}
          className="glass-morphism p-4 rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Update</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.lastUpdated 
                  ? stats.lastUpdated.toLocaleDateString()
                  : 'No notes yet'
                }
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Pinned Notes */}
      {stats.pinnedNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PinIcon className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pinned Notes
              </h2>
            </div>
            <button
              onClick={() => navigate('/dashboard/notes')}
              className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.pinnedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                className="cursor-pointer"
              >
                <NoteCard note={note} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600 dark:text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
          </div>
          <button
            onClick={() => navigate('/dashboard/notes')}
            className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.slice(0, 3).map(note => (
            <div
              key={note.id}
              onClick={() => handleEditNote(note)}
              className="cursor-pointer"
            >
              <NoteCard note={note} />
            </div>
          ))}
        </div>
      </div>

      <NewNoteModal
        isOpen={showNewNoteModal}
        onClose={() => setShowNewNoteModal(false)}
      />

      <EditNoteModal
        isOpen={selectedNote !== null}
        onClose={handleCloseEditModal}
        note={selectedNote}
      />
    </div>
  );
}