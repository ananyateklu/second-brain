import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
  linkedNotes: string[];
}

interface NotesContextType {
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNotes'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  addLink: (sourceId: string, targetId: string) => void;
  removeLink: (sourceId: string, targetId: string) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Project Planning Framework',
    content: 'A comprehensive framework for planning and executing projects effectively. Key components include scope definition, timeline management, and resource allocation.',
    tags: ['project-management', 'planning', 'framework'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    isPinned: true,
    isFavorite: true,
    linkedNotes: []
  },
  {
    id: '2',
    title: 'Agile Methodology Overview',
    content: 'Deep dive into Agile principles and practices. Covers sprint planning, daily standups, retrospectives, and continuous improvement.',
    tags: ['agile', 'methodology', 'project-management'],
    createdAt: '2024-01-16T14:30:00Z',
    updatedAt: '2024-01-16T14:30:00Z',
    isPinned: false,
    isFavorite: true,
    linkedNotes: []
  },
  {
    id: '3',
    title: 'Resource Allocation Strategies',
    content: 'Best practices for allocating resources across projects. Includes techniques for balancing workload and optimizing team performance.',
    tags: ['resources', 'management', 'planning'],
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-17T09:15:00Z',
    isPinned: false,
    isFavorite: false,
    linkedNotes: []
  }
];

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'linkedNotes'>) => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedNotes: []
    };
    setNotes(prev => [newNote, ...prev]);
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date().toISOString() }
        : note
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      // First, remove all links to this note from other notes
      const updatedNotes = prev.map(note => ({
        ...note,
        linkedNotes: note.linkedNotes.filter(linkedId => linkedId !== id)
      }));
      // Then remove the note itself
      return updatedNotes.filter(note => note.id !== id);
    });
  }, []);

  const togglePinNote = useCallback((id: string) => {
    setNotes(prev => prev.map(note =>
      note.id === id
        ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() }
        : note
    ));
  }, []);

  const toggleFavoriteNote = useCallback((id: string) => {
    setNotes(prev => prev.map(note =>
      note.id === id
        ? { ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() }
        : note
    ));
  }, []);

  const addLink = useCallback((sourceId: string, targetId: string) => {
    setNotes(prev => {
      return prev.map(note => {
        if (note.id === sourceId) {
          const currentLinks = note.linkedNotes || [];
          if (!currentLinks.includes(targetId)) {
            return {
              ...note,
              linkedNotes: [...currentLinks, targetId],
              updatedAt: new Date().toISOString()
            };
          }
        }
        if (note.id === targetId) {
          const currentLinks = note.linkedNotes || [];
          if (!currentLinks.includes(sourceId)) {
            return {
              ...note,
              linkedNotes: [...currentLinks, sourceId],
              updatedAt: new Date().toISOString()
            };
          }
        }
        return note;
      });
    });
  }, []);

  const removeLink = useCallback((sourceId: string, targetId: string) => {
    setNotes(prev => {
      return prev.map(note => {
        if (note.id === sourceId || note.id === targetId) {
          return {
            ...note,
            linkedNotes: (note.linkedNotes || []).filter(id => 
              id !== (note.id === sourceId ? targetId : sourceId)
            ),
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      });
    });
  }, []);

  return (
    <NotesContext.Provider value={{ 
      notes, 
      addNote, 
      updateNote, 
      deleteNote,
      togglePinNote,
      toggleFavoriteNote,
      addLink,
      removeLink
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}