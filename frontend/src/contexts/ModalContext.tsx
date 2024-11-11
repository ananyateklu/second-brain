import React, { createContext, useContext, useState } from 'react';
import { Note } from './NotesContext';

interface ModalContextType {
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  return (
    <ModalContext.Provider value={{ selectedNote, setSelectedNote }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
} 